// ─────────────────────────────────────────────────────────────
// Mata Viva Worker — replaces Cloudflare Pages Functions.
// ─────────────────────────────────────────────────────────────
import { prerenderContent, RAW_BASE } from './content';
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
//   ADMIN_EMAILS — comma-separated BOOTSTRAP admins (fail-closed).
//     Emails que podem entrar SEM depender da lista assinada e que
//     emitem o cookie de gestão da equipe (nunca são bloqueáveis pela
//     UI). Mantenha apenas a(s) conta(s) raiz.
//   EDITORS_HMAC_KEY — HMAC key (secret) que assina a lista de
//     editores (data/editor_logins.json) e o cookie de admin. Só o
//     Worker a conhece; edições fora do endpoint invalidam a lista.
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

  // 3. Allowlist — fail closed.
  //    bootstrap (ADMIN_EMAILS, inalterável) ∪ lista de equipe assinada
  //    (data/editor_logins.json). Lista com assinatura inválida é
  //    ignorada: um editor que adultere o arquivo não se promove.
  const bootstrap = allowedEmails(env);
  const list = await readEditorList(env);
  const allowed = new Set(bootstrap);
  if (list.ok) {
    list.admins.forEach((e) => allowed.add(e));
    list.editores.forEach((e) => allowed.add(e));
  }
  if (!allowed.has(email)) return json({ error: 'not-an-editor' }, 403);
  const isBootstrapAdmin = bootstrap.has(email);

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
  const headers: Record<string, string> = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  };
  // Bootstraps recebem o cookie HttpOnly que autoriza a gestão da equipe.
  if (isBootstrapAdmin) {
    const adminToken = await makeAdminCookie(email, env);
    if (adminToken) {
      headers['Set-Cookie'] =
        `${ADMIN_COOKIE}=${adminToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`;
    }
  }
  return new Response(htmlContent, { headers });
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

// ─── Lista de equipe assinada (HMAC) ──────────────────────────
// A lista de quem pode entrar/editores viva em data/editor_logins.json
// no repo, gerenciada pela UI do Painel. Ela é ASSINADA com a chave
// EDITORS_HMAC_KEY (só o Worker a conhece):
//   - O endpoint POST /api/editor-logins (cookie admin) grava a lista
//     já assinada — é o único caminho legítimo de escrita.
//   - O callback e o /api/me rejeitam listas com assinatura inválida
//     (fail-closed): um editor que adultere o arquivo com o token do
//     GitHub App não consegue se promover.
// ADMIN_EMAILS vira o bootstrap inalterável (conta raiz).

const EDITOR_LIST_PATH = 'data/editor_logins.json';
const ADMIN_COOKIE = 'mv_admin';

interface EditorList {
  ok: boolean; // lista carregada E assinatura válida (ou ausente)
  admins: string[];
  editores: string[];
}

const EMPTY_LIST: EditorList = { ok: true, admins: [], editores: [] };

function normEmail(e: unknown): string {
  return String(e ?? '').trim().toLowerCase();
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function emailListValid(list: unknown): list is string[] {
  return (
    Array.isArray(list) &&
    list.length <= 50 &&
    list.every((e) => typeof e === 'string' && EMAIL_RE.test(normEmail(e)))
  );
}

function normalizeEmailList(list: string[]): string[] {
  return Array.from(new Set(list.map(normEmail).filter(Boolean))).sort();
}

async function hmacKey(env: Env): Promise<CryptoKey | null> {
  const secret = env.EDITORS_HMAC_KEY || '';
  if (!secret) return null;
  try {
    return await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
    );
  } catch {
    return null;
  }
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function signPayload(key: CryptoKey, payload: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return b64url(sig);
}

async function verifyPayload(key: CryptoKey, payload: string, sigB64: string): Promise<boolean> {
  if (!key || !sigB64) return false;
  try {
    return await crypto.subtle.verify('HMAC', key, b64urlToBytes(sigB64), enc.encode(payload));
  } catch {
    return false;
  }
}

/** Assina {admins, editores} — JSON canônico (emails normalizados). */
async function signEditorList(env: Env, admins: string[], editores: string[]): Promise<{ sig: string; payload: string; admins: string[]; editores: string[] } | null> {
  const key = await hmacKey(env);
  if (!key) return null;
  const normAdmins = normalizeEmailList(admins);
  const normEditores = normalizeEmailList(editores);
  const payload = JSON.stringify({ admins: normAdmins, editores: normEditores });
  const sig = await signPayload(key, payload);
  return { sig, payload, admins: normAdmins, editores: normEditores };
}

/**
 * Lê a lista via GitHub API (sempre fresca, sem cache do raw) e valida
 * a assinatura. Ausente (404) = lista vazia válida. Assinatura inválida
 * ou leitura falha = lista ignorada (fail-closed).
 */
async function readEditorList(env: Env): Promise<EditorList> {
  try {
    const token = await getInstallationToken(env);
    const base = `https://api.github.com/repos/ongmataviva/website/contents/${EDITOR_LIST_PATH}`;
    const res = await fetch(`${base}?ref=content`, { headers: ghHeaders(token) });
    if (res.status === 404) return EMPTY_LIST;
    if (!res.ok) return { ...EMPTY_LIST, ok: false };
    const meta = await res.json();
    const bytes = b64urlToBytes(String(meta.content).replace(/\s/g, ''));
    const text = new TextDecoder('utf-8').decode(bytes);
    const data = JSON.parse(text) as { admins?: unknown; editores?: unknown; sig?: unknown };
    if (!emailListValid(data.admins) || !emailListValid(data.editores) || typeof data.sig !== 'string') {
      return { ...EMPTY_LIST, ok: false };
    }
    const key = await hmacKey(env);
    if (!key) return { ...EMPTY_LIST, ok: false };
    const admins = normalizeEmailList(data.admins);
    const editores = normalizeEmailList(data.editores);
    const payload = JSON.stringify({ admins, editores });
    if (!(await verifyPayload(key, payload, data.sig))) return { ...EMPTY_LIST, ok: false };
    return { ok: true, admins, editores };
  } catch {
    return { ...EMPTY_LIST, ok: false };
  }
}

/** Grava a lista assinada no repo (único caminho legítimo: endpoint admin). */
async function writeEditorList(env: Env, admins: string[], editores: string[]): Promise<boolean> {
  const signed = await signEditorList(env, admins, editores);
  if (!signed) return false;
  const body = `${JSON.stringify({ admins: signed.admins, editores: signed.editores, sig: signed.sig }, null, 2)}\n`;
  const rawBytes = enc.encode(body);
  let bin = '';
  for (const b of rawBytes) bin += String.fromCharCode(b);
  const contentB64 = btoa(bin);
  try {
    const token = await getInstallationToken(env);
    const base = `https://api.github.com/repos/ongmataviva/website/contents/${EDITOR_LIST_PATH}`;
    let sha: string | undefined;
    const cur = await fetch(`${base}?ref=content`, { headers: ghHeaders(token) });
    if (cur.status === 404) sha = undefined;
    else if (cur.ok) sha = (await cur.json()).sha;
    else return false;
    const put = await fetch(base, {
      method: 'PUT',
      headers: ghHeaders(token),
      body: JSON.stringify({
        message: 'chore(admin): update editor list',
        branch: 'content',
        content: contentB64,
        ...(sha ? { sha } : {}),
      }),
    });
    return put.ok;
  } catch {
    return false;
  }
}

// ─── Cookie de admin (bootstrap) ─────────────────────────────
// O cookie é HttpOnly e assinado com a MESMA chave HMAC: só quem
// passa no login com email bootstrap o recebe, e só o Worker o
// valida. Ele autoriza a gestão da lista de equipe (/api/editor-logins).

async function makeAdminCookie(email: string, env: Env): Promise<string | null> {
  const key = await hmacKey(env);
  if (!key) return null;
  // Email em base64url (sem pontos) para não quebrar o split do token.
  const emailEnc = b64url(enc.encode(email).buffer);
  const exp = Math.floor(Date.now() / 1000) + 7 * 86400;
  const payload = `${emailEnc}.${exp}`;
  const sig = await signPayload(key, payload);
  return `${payload}.${sig}`;
}

async function verifyAdminCookie(cookieHeader: string | null, env: Env): Promise<string | null> {
  if (!cookieHeader) return null;
  const entry = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${ADMIN_COOKIE}=`));
  if (!entry) return null;
  const token = entry.slice(ADMIN_COOKIE.length + 1);
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [emailEnc, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  const key = await hmacKey(env);
  if (!key) return null;
  const okSig = await verifyPayload(key, `${emailEnc}.${expStr}`, sig);
  if (!okSig) return null;
  try {
    return normEmail(new TextDecoder().decode(b64urlToBytes(emailEnc)));
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// Main fetch handler
// ──────────────────────────────────────────────────────────────

// Rotas estáticas que nunca devem receber o shell de conteúdo (fallback).
const STATIC_PREFIXES = new Set([
  'admin',
  'assets',
  '_astro',
  '_purge',
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

    // ── Equipe (gestão de acesso pela UI) ────────────────────
    // GET /api/me — o painel pergunta quem é admin com autoridade
    // (bootstrap + lista assinada). O painel nunca vê a chave HMAC.
    if (url.pathname === '/api/me') {
      const email = normEmail(url.searchParams.get('email') || '');
      const cookieEmail = await verifyAdminCookie(request.headers.get('cookie'), env);
      let isAdmin = false;
      if (cookieEmail) {
        isAdmin = true;
      } else if (email) {
        const bootstrap = allowedEmails(env);
        const list = await readEditorList(env);
        isAdmin = bootstrap.has(email) || (list.ok && list.admins.includes(email));
      }
      return json({ email: cookieEmail || email, isAdmin, canEditList: Boolean(cookieEmail) });
    }

    // POST /api/editor-logins — grava a lista de equipe assinada.
    // Só quem tem o cookie de admin (bootstrap) pode alterar.
    if (url.pathname === '/api/editor-logins' && request.method === 'POST') {
      const cookieEmail = await verifyAdminCookie(request.headers.get('cookie'), env);
      if (!cookieEmail) return json({ error: 'unauthorized' }, 403);
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'bad-request' }, 400);
      }
      const { admins, editores } = (body ?? {}) as { admins?: unknown; editores?: unknown };
      if (!emailListValid(admins) || !emailListValid(editores)) {
        return json({ error: 'invalid-emails' }, 400);
      }
      const okWrite = await writeEditorList(env, admins as string[], editores as string[]);
      if (!okWrite) return json({ error: 'write-failed' }, 500);
      return json({ ok: true });
    }

    // ── Purga de cache (invocado pelo admin após salvar) ─────
    // O worker cacheia os fetches do raw (index.json + markdown) com o
    // max-age do próprio raw (5 min). Sem purga, uma edição feita no admin
    // só aparecia no site minutos depois. O admin chama
    //   /_purge?paths=data/index.json,content/noticia/<slug>.md
    // logo após persistir, e o site reflete a mudança no próximo request.
    if (url.pathname === '/_purge') {
      const paths = (url.searchParams.get('paths') || '')
        .split(',')
        .map((p) => p.trim())
        .filter((p) => /^(data|content)\/[A-Za-z0-9_./-]+\.?(md|json)?$/.test(p));
      const cache = caches.default;
      let purged = 0;
      for (const p of paths) {
        if (await cache.delete(`${RAW_BASE}/${p}`)) purged += 1;
      }
      return new Response(JSON.stringify({ ok: true, purged }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
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
          // no-store: o HTML nunca é cacheado (nem edge nem navegador). A
          // purga /_purge + o cache do raw mantêm o custo baixo; em troca,
          // edições do admin aparecem imediatamente no próximo request.
          'Cache-Control': 'no-store',
        },
      });
    }

    // ── Static assets / redirects / admin / 404 ───────────────
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
