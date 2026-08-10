// ─────────────────────────────────────────────────────────────
// Mata Viva Worker — replaces Cloudflare Pages Functions.
// ─────────────────────────────────────────────────────────────
import { prerenderContent } from './content';
// Routes:
//   /auth              → DecapCMS login (Google OAuth front-door)
//   /callback          → Google code exchange → GitHub App token
//                        for DecapCMS (provider: "github")
//   /qualidade-da-agua/*, /bacia/*, /terrenos/*, /ocorrencias/*
//                     → descontinuadas em 2026-08-10 (retornam 404)
//
// Everything else falls through to Workers Static Assets.
//
// NOTE: Boyuna is an independent project (own repo + own deployment
// at mataviva-boyuna.pages.dev). It is NOT served from this repo.
//
// Env vars needed:
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — Google OAuth app
//     (callback URI: https://<site>/callback)
//   ADMIN_EMAILS — comma-separated allowlist of editor emails
//   GITHUB_APP_ID / GITHUB_APP_INSTALLATION_ID / GITHUB_APP_PRIVATE_KEY
//     — GitHub App with Contents: read & write on ongmataviva/website.
//     PRIVATE_KEY is the app PEM, base64-encoded.

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// ─── Google OAuth (DecapCMS login) ───────────────────────────

function allowedEmails(env: Env): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function handleAuth(request: Request, env: Env): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID) return json({ error: 'GOOGLE_CLIENT_ID not configured' }, 500);

  const url = new URL(request.url);
  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  googleUrl.searchParams.set('redirect_uri', `${url.origin}/callback`);
  googleUrl.searchParams.set('response_type', 'code');
  googleUrl.searchParams.set('scope', 'openid email profile');
  googleUrl.searchParams.set('access_type', 'online');
  return new Response(null, { status: 302, headers: { Location: googleUrl.toString() } });
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return json({ error: 'missing code' }, 400);

  // 1. Exchange the Google code for an id_token.
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/callback`,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.id_token) return json({ error: 'login failed' }, 401);

  // 2. Decode the id_token payload (base64url). Obtained directly from
  //    Google over TLS; signature verification is optional for this flow.
  const payloadPart = tokens.id_token.split('.')[1];
  const padded = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
  const decodedPayload = atob(padded);
  const payloadBytes = new Uint8Array(decodedPayload.length);
  for (let i = 0; i < decodedPayload.length; i++) {
    payloadBytes[i] = decodedPayload.charCodeAt(i);
  }
  const payload = JSON.parse(new TextDecoder('utf-8').decode(payloadBytes));
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
  const name = typeof payload.name === 'string' ? payload.name : '';
  if (!email) return json({ error: 'no-email' }, 401);

  // 3. Allowlist check — fail closed.
  if (!allowedEmails(env).has(email)) return json({ error: 'not-an-editor' }, 403);

  // 4. Get a GitHub App installation token for DecapCMS to write to the repo.
  let token: string;
  try {
    token = await getInstallationToken(env);
  } catch {
    return json({ error: 'sync-unavailable' }, 503);
  }

  // 5. Full-page redirect flow: guarda a sessão em sessionStorage (mesma
  //    origem) e volta para o /admin/. Sem popup/postMessage.
  const user = { login: email, name, email };
  const authPayload = JSON.stringify({ token, provider: 'github', user });
  const htmlContent = `<!DOCTYPE html><html><body><script>
    sessionStorage.setItem('mataviva-auth', ${JSON.stringify(authPayload)});
    window.location.replace('/admin/');
  </script></body></html>`;
  return new Response(htmlContent, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// ─── GitHub App installation token ───────────────────────────

const enc = new TextEncoder();

function b64url(data: ArrayBuffer): string {
  const bin = btoa(String.fromCharCode(...new Uint8Array(data)));
  return bin.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function ghHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'mataviva',
  };
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// DER length field (short form for <128, long form otherwise).
function derLength(value: number): Uint8Array {
  if (value < 0x80) return Uint8Array.of(value);
  if (value < 0x100) return Uint8Array.of(0x81, value);
  return Uint8Array.of(0x82, value >> 8, value & 0xff);
}

// GitHub App private keys are often PKCS#1 ("BEGIN RSA PRIVATE KEY").
// WebCrypto only imports PKCS#8, so wrap the PKCS#1 DER inside a
// PrivateKeyInfo: SEQUENCE { INTEGER 0, SEQUENCE { OID rsaEncryption, NULL },
// OCTET STRING { rsaDer } }.
function wrapPkcs1ToPkcs8(rsaDer: Uint8Array): Uint8Array {
  const version = new Uint8Array([0x02, 0x01, 0x00]);
  const algorithm = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]);
  const octetString = concatBytes([Uint8Array.of(0x04), derLength(rsaDer.length), rsaDer]);
  const inner = concatBytes([version, algorithm, octetString]);
  return concatBytes([Uint8Array.of(0x30), derLength(inner.length), inner]);
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const isPkcs1 = pem.includes('BEGIN RSA PRIVATE KEY');
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const pkcs8 = isPkcs1 ? wrapPkcs1ToPkcs8(der) : der;
  return crypto.subtle.importKey(
    'pkcs8', pkcs8, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
}

async function signJwt(appId: string, privateKeyPem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: appId, iat: now - 60, exp: now + 540 };
  const input = `${b64url(enc.encode(JSON.stringify(header)))}.${b64url(enc.encode(JSON.stringify(payload)))}`;
  const key = await importPrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(input));
  return `${input}.${b64url(sig)}`;
}

async function getInstallationToken(env: Env): Promise<string> {
  const pem = atob(env.GITHUB_APP_PRIVATE_KEY); // stored base64-encoded PEM
  const jwt = await signJwt(env.GITHUB_APP_ID, pem);
  const res = await fetch(
    `https://api.github.com/app/installations/${env.GITHUB_APP_INSTALLATION_ID}/access_tokens`,
    { method: 'POST', headers: ghHeaders(jwt) },
  );
  if (!res.ok) throw new Error(`github app token failed: ${res.status}`);
  const data = await res.json();
  return data.token;
}

// ──────────────────────────────────────────────────────────────
// Main fetch handler
// ──────────────────────────────────────────────────────────────

// Rotas estáticas que nunca devem receber o shell de conteúdo (fallback).
const STATIC_PREFIXES = new Set([
  'admin',
  'assets',
  '_astro',
  'images',
  'auth',
  'callback',
  'busca',
  'bacia',
  'qualidade-da-agua',
]);

/**
 * Rotas de conteúdo dinâmico (Opção C): servidas pelo shell único — o
 * ContentApp roteia pelo pathname e busca os dados no GitHub.
 *   /noticias, /noticias/*, /categoria/*, /autor/*, /tag/*
 *   e slugs top-level (páginas institucionais: /sobre, /projetos, ...)
 */
function isContentPath(pathname: string): boolean {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return true;
  if (['noticias', 'categoria', 'autor', 'tag'].includes(segs[0])) return true;
  if (segs.length === 1 && !segs[0].includes('.')) {
    return !STATIC_PREFIXES.has(segs[0]);
  }
  return false;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ── DecapCMS login (Google OAuth front-door) ──────────────
    if (url.pathname === '/auth') {
      return handleAuth(request, env);
    }
    if (url.pathname === '/callback') {
      return handleCallback(request, env);
    }

    // ── Imagens (Opção C) ─────────────────────────────────────
    // As do último build vivem no ASSETS; mídia nova commitada pelo CMS
    // vive no repo público (public/images/...) — redireciona para o raw.
    if (url.pathname.startsWith('/images/')) {
      const local = await env.ASSETS.fetch(request);
      if (local.status !== 404) return local;
      const raw = new URL(
        url.pathname.slice(1),
        'https://raw.githubusercontent.com/ongmataviva/website/content/',
      );
      return Response.redirect(raw.toString(), 302);
    }

    // ── Conteúdo dinâmico: prerender (SEO) ────────────────────
    // ANTES do ASSETS: a home é um arquivo estático real (index.html) e
    // as demais rotas de conteúdo não existem no dist. Renderiza
    // server-side o HTML do conteúdo (título, meta, markup) e injeta no
    // shell único. O ContentApp hidrata por cima no navegador.
    if (isContentPath(url.pathname)) {
      const shellRes = await env.ASSETS.fetch(new Request(new URL('/', url).toString()));
      const shell = await shellRes.text();
      const wait = (p: Promise<unknown>) => _ctx.waitUntil(p);
      const { status, html } = await prerenderContent(url.pathname, shell, wait);
      return new Response(html, {
        status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': status === 404 ? 'public, max-age=60' : 'public, max-age=300',
        },
      });
    }

    // ── Static assets / redirects / admin / 404 ───────────────
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
