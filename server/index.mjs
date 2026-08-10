// Mata Viva — local Laika CMS dev server (single process, port 9191).
// Replaces the old two-process setup (decap-cms-server :8095 + python :8788):
//   - POST /api/v1            classic Decap proxy protocol, fs-backed
//                             (mirrors @laikacms/decap-cms dev-server localFs;
//                              the browser's proxy backend detects it via
//                              { action: 'info' } and switches backend: proxy)
//   - /admin/                 Laika admin shell: transformed config.yml
//                             (backend proxy + local_backend url), the laika
//                             bundle (.local/admin/cms-laika.js) and its assets
//   - everything else         static files from public/ (site preview)
//
// Production is untouched: public/admin/config.yml and public/admin/cms.js
// are never written by this server.
import http from 'node:http';
import { promises as fsp } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { yamlEntryCodec } from '@laikacms/decap-cms/entry-codecs/yaml';

// The server is always run from the project root (pnpm cms:server).
const ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(ROOT, 'public');
const LOCAL_DIR = path.join(ROOT, '.local');
const LAIKA_BUNDLE = path.join(LOCAL_DIR, 'admin', 'cms-laika.js');
const CONFIG_FILE = path.join(PUBLIC_DIR, 'admin', 'config.yml');

const PORT = Number(process.env.PORT || 9191);
const REPO_PATH = process.env.GIT_REPO_DIRECTORY
  ? path.resolve(process.env.GIT_REPO_DIRECTORY)
  : ROOT;

// ---------------------------------------------------------------------------
// Logging / helpers
// ---------------------------------------------------------------------------
const log = {
  info: (...a) => console.log('[cms-server]', ...a),
  error: (...a) => console.error('[cms-server]', ...a),
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

async function readBodyBuffer(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(req) {
  const raw = await readBodyBuffer(req);
  if (raw.length === 0) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    return null;
  }
}

// Resolve `p` under `base`, rejecting traversal outside it.
function safeJoin(base, p) {
  const resolved = path.resolve(base, p);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.map': 'application/json',
};

function mimeFor(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function serveFile(res, filePath, isHead = false) {
  const stat = await fsp.stat(filePath);
  if (!stat.isFile()) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }
  res.writeHead(200, {
    'Content-Type': mimeFor(filePath),
    'Content-Length': stat.size,
    'Cache-Control': 'no-cache',
  });
  if (isHead) {
    res.end();
    return;
  }
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}

// ---------------------------------------------------------------------------
// Classic Decap proxy protocol (fs-backed). Mirrors the fork's
// dev-server localFsMiddleware so the stock proxy backend works unchanged.
// ---------------------------------------------------------------------------
async function listFiles(dir, extension, depth) {
  if (depth <= 0) return [];
  try {
    const dirents = await fsp.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      dirents.map((dirent) => {
        const res = path.join(dir, dirent.name);
        return dirent.isDirectory()
          ? listFiles(res, extension, depth - 1)
          : [res].filter((f) => f.endsWith(extension));
      })
    );
    return [].concat(...files);
  } catch {
    return [];
  }
}

async function listRepoFiles(folder, extension, depth) {
  const files = await listFiles(path.join(REPO_PATH, folder), extension, depth);
  return files.map((f) => f.slice(REPO_PATH.length + 1));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

const normalizePath = (p) => p.replace(/\\/g, '/');

async function entriesFromFiles(files) {
  return Promise.all(
    files.map(async (file) => {
      try {
        const content = await fsp.readFile(safeJoin(REPO_PATH, file.path));
        return {
          data: content.toString(),
          file: { path: normalizePath(file.path), label: file.label, id: sha256(content) },
        };
      } catch {
        return { data: null, file: { path: normalizePath(file.path), label: file.label, id: null } };
      }
    })
  );
}

async function readMediaFile(file) {
  const buffer = await fsp.readFile(safeJoin(REPO_PATH, file));
  return {
    id: sha256(buffer),
    content: buffer.toString('base64'),
    encoding: 'base64',
    path: normalizePath(file),
    name: path.basename(file),
  };
}

async function writeRepoFile(relPath, content) {
  const full = safeJoin(REPO_PATH, relPath);
  await fsp.mkdir(path.dirname(full), { recursive: true });
  await fsp.writeFile(full, content);
}

async function moveRepoFile(from, to, hasSubfolders = true) {
  const fromFull = safeJoin(REPO_PATH, from);
  const toFull = safeJoin(REPO_PATH, to);
  await fsp.mkdir(path.dirname(toFull), { recursive: true });
  await fsp.rename(fromFull, toFull);
  if (hasSubfolders) {
    // Legacy behavior (subfolders: true, default): move every file in the
    // entry's directory (used by collections where a folder is one entry).
    const sourceDir = path.dirname(fromFull);
    const destDir = path.dirname(toFull);
    const allFiles = await listFiles(sourceDir, '', 100);
    await Promise.all(
      allFiles.map((file) =>
        fsp
          .mkdir(path.dirname(file.replace(sourceDir, destDir)), { recursive: true })
          .then(() => fsp.rename(file, file.replace(sourceDir, destDir)))
          .catch(() => undefined)
      )
    );
  }
}

async function handleProxy(req, res) {
  const body = await readJsonBody(req);
  if (!body || typeof body.action !== 'string') {
    sendJson(res, 400, { error: 'Invalid request body' });
    return;
  }
  const params = body.params || {};
  try {
    switch (body.action) {
      case 'info': {
        sendJson(res, 200, {
          repo: path.basename(REPO_PATH),
          publish_modes: ['simple'],
          type: 'local_fs',
        });
        break;
      }
      case 'entriesByFolder': {
        const { folder, extension, depth } = params;
        const files = await listRepoFiles(folder, extension ?? '', depth ?? 1);
        const entries = await entriesFromFiles(files.map((f) => ({ path: f })));
        sendJson(res, 200, entries);
        break;
      }
      case 'entriesByFiles': {
        const entries = await entriesFromFiles(params.files || []);
        sendJson(res, 200, entries);
        break;
      }
      case 'getEntry': {
        const [entry] = await entriesFromFiles([{ path: params.path }]);
        sendJson(res, 200, entry);
        break;
      }
      case 'persistEntry': {
        const { entry, dataFiles = [entry], assets = [], options } = params;
        const hasSubfolders = options?.hasSubfolders !== false;
        await Promise.all(dataFiles.map((df) => writeRepoFile(df.path, df.raw)));
        await Promise.all(
          assets.map((a) => writeRepoFile(a.path, Buffer.from(a.content, a.encoding)))
        );
        if (dataFiles.length > 0 && dataFiles.every((df) => df.newPath)) {
          await Promise.all(dataFiles.map((df) => moveRepoFile(df.path, df.newPath, hasSubfolders)));
        }
        sendJson(res, 200, { message: 'entry persisted' });
        break;
      }
      case 'getMedia': {
        const { mediaFolder } = params;
        const files = await listRepoFiles(mediaFolder ?? '', '', 1);
        const mediaFiles = await Promise.all(files.map((f) => readMediaFile(f)));
        sendJson(res, 200, mediaFiles);
        break;
      }
      case 'getMediaFile': {
        const mediaFile = await readMediaFile(params.path);
        sendJson(res, 200, mediaFile);
        break;
      }
      case 'persistMedia': {
        const { asset } = params;
        await writeRepoFile(asset.path, Buffer.from(asset.content, asset.encoding));
        const file = await readMediaFile(asset.path);
        sendJson(res, 200, file);
        break;
      }
      case 'deleteFile': {
        await fsp.unlink(safeJoin(REPO_PATH, params.path)).catch(() => undefined);
        sendJson(res, 200, { message: `deleted file ${params.path}` });
        break;
      }
      case 'deleteFiles': {
        await Promise.all(
          (params.paths || []).map((p) => fsp.unlink(safeJoin(REPO_PATH, p)).catch(() => undefined))
        );
        sendJson(res, 200, { message: `deleted files ${(params.paths || []).join(', ')}` });
        break;
      }
      case 'getDeployPreview': {
        sendJson(res, 200, null);
        break;
      }
      default: {
        sendJson(res, 422, { error: `Unknown action ${body.action}` });
      }
    }
  } catch (e) {
    log.error(`Error handling ${JSON.stringify(body)}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    sendJson(res, 500, { error: 'Unknown error' });
  }
}

// ---------------------------------------------------------------------------
// Local admin config (transformed copy of public/admin/config.yml)
// ---------------------------------------------------------------------------
let cachedConfig = null;

function buildLocalConfig() {
  const source = fs.readFileSync(CONFIG_FILE, 'utf8');
  const cfg = yamlEntryCodec.parseConfig(source);
  // Local data plane: classic proxy protocol served by this process. Prod
  // config.yml (backend: github) is never touched.
  cfg.backend = { name: 'proxy' };
  cfg.local_backend = { url: `http://localhost:${PORT}/api/v1` };
  delete cfg.publish_mode;
  return yamlEntryCodec.formatter.toFile(cfg);
}

function getLocalConfig() {
  if (!cachedConfig) cachedConfig = buildLocalConfig();
  return cachedConfig;
}

// ---------------------------------------------------------------------------
// Static serving
// ---------------------------------------------------------------------------
async function serveAdminIndex(res) {
  const indexPath = path.join(PUBLIC_DIR, 'admin', 'index.html');
  let html = await fsp.readFile(indexPath, 'utf8');
  // Point the page at the laika bundle instead of the prod (upstream) one.
  html = html.replace('src="./cms.js"', 'src="./cms-laika.js"');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(html);
}

async function serveStatic(res, pathname, isHead = false) {
  let filePath;
  if (pathname.startsWith('/admin/') && pathname !== '/admin/') {
    // Laika bundle assets live in .local/admin; prod admin assets in public/admin.
    const localCandidate = path.join(LOCAL_DIR, 'admin', pathname.slice('/admin/'.length));
    const publicCandidate = path.join(PUBLIC_DIR, 'admin', pathname.slice('/admin/'.length));
    try {
      const localStat = await fsp.stat(localCandidate);
      if (localStat.isFile()) filePath = localCandidate;
    } catch {
      /* fall through */
    }
    if (!filePath) filePath = publicCandidate;
  } else {
    filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  }
  try {
    await serveFile(res, filePath, isHead);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  } catch {
    sendJson(res, 400, { error: 'Bad request' });
    return;
  }

  const started = Date.now();
  const done = () => {
    res.on('finish', () => log.info(`${req.method} ${pathname} ${res.statusCode} (${Date.now() - started}ms)`));
  };
  done();

  // CORS: o admin pode estar em outra origem (wrangler dev :8786, astro dev
  // :4545). O probe do proxy ({action:'info'}) é um POST application/json,
  // que dispara preflight OPTIONS — sem estes headers o navegador bloqueia.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  try {
    if (req.method === 'POST' && pathname === '/api/v1') {
      return await handleProxy(req, res);
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      const isHead = req.method === 'HEAD';
      if (pathname === '/admin') {
        res.writeHead(302, { Location: '/admin/' });
        return res.end();
      }
      if (pathname === '/admin/') return await serveAdminIndex(res);
      if (pathname === '/admin/config.yml') {
        return res.writeHead(200, { 'Content-Type': 'text/yaml; charset=utf-8', 'Cache-Control': 'no-cache' }).end(getLocalConfig());
      }
      if (pathname === '/admin/cms-laika.js') {
        try {
          return await serveFile(res, LAIKA_BUNDLE, isHead);
        } catch {
          return sendJson(res, 404, {
            error: 'Laika bundle not built yet. Run: pnpm cms:build:laika',
          });
        }
      }
      return await serveStatic(res, pathname, isHead);
    }
    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    log.error(`Request error ${req.method} ${pathname}:`, e instanceof Error ? e.message : e);
    sendJson(res, 500, { error: 'Internal error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  log.info(`Laika CMS dev server running at http://localhost:${PORT}`);
  log.info(`  Admin:  http://localhost:${PORT}/admin/`);
  log.info(`  Proxy:  http://localhost:${PORT}/api/v1`);
});
