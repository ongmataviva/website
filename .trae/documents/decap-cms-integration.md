# Plan: Decap CMS Integration (GitHub + Cloudflare Pages)

## Summary

Add a FOSS, Git-backed content management layer using **Decap CMS** to this workspace, wired to:

- **GitHub repo** `ongmataviva/website` (empty, just created — SSH remote `git@github.com:ongmataviva/website.git`) as the Git filesystem target.
- **Cloudflare Pages** project (to be created during execution, e.g. `ongmataviva.pages.dev`) for static hosting + OAuth token exchange via Pages Functions.

The existing Baserow self-hosted stack is quarantined into a `_baserow/` directory (per user decision — "move everything baserow-related into a _baserow directory, we can decide what to do with it later"). The whole workspace is committed to the repo.

This is strictly additive: no existing CMS is destroyed or assumed. There is no site yet, so the admin SPA, functions, and folder structure are created from scratch.

---

## Current State Analysis

Exploration findings (Phase 1):

- `/Users/altgoncalves/Projects/mataviva` is **not a git repository** (no `.git`).
- No static asset directory, no frontend build system, no `public/`/`static/`, no HTML files.
- Existing content is a **self-hosted Baserow stack**:
  - `docker-compose.yaml`, `docker-compose.dev.yml`, `Caddyfile.dev`, `.env` (gitignored, secrets)
  - `docs/baserow/` (setup/troubleshooting/ai-assistant docs)
  - `scripts/baserow/build_contact_app.py` (Builder app construction, run via `manage.py shell` in the backend container)
  - `ideas/` (project vision + domain-model checkpoints)
  - `.trae/` tooling: `skills/baserow-builder/SKILL.md` (real file), `documents/baserow-builder-app-handsfree.md`, `documents/baserow-kuma-schema-prompts.md`, `mcp.json` (gitignored)
  - `package.json` (ybyra-harness only: `postinstall` → `scripts/link-trae.sh`)
- `.gitignore` already covers: `.env` (any level), `.trae/mcp.json`, `pgdata/`, `media/`.
- No existing CMS/framework to preserve. The Decap handoff spec's assumptions (existing `public/`, existing build system, existing GitHub repo) do not hold — paths and setup are created fresh.

References that must be updated when files move to `_baserow/`:
- [SKILL.md](file:///Users/altgoncalves/Projects/mataviva/.trae/skills/baserow-builder/SKILL.md) lines ~40-41 (`docker compose -f docker-compose.dev.yml exec -T backend … < scripts/baserow/build_contact_app.py`) and line ~217 (reference implementation path).
- [baserow-builder-app-handsfree.md](file:///Users/altgoncalves/Projects/mataviva/.trae/documents/baserow-builder-app-handsfree.md) line ~10 (`scripts/baserow/build_contact_app.py`).
- `docs/baserow/*.md` reference `docker-compose.dev.yml` — these move together into `_baserow/docs/`, so their relative commands stay valid when run from `_baserow/`.

---

## Proposed Changes

### Step A — Quarantine Baserow into `_baserow/`

Move (plain `mv`, repo not yet initialized):

| From (root) | To |
|---|---|
| `docker-compose.yaml` | `_baserow/docker-compose.yaml` |
| `docker-compose.dev.yml` | `_baserow/docker-compose.dev.yml` |
| `Caddyfile.dev` | `_baserow/Caddyfile.dev` |
| `.env` | `_baserow/.env` (stays gitignored — `.env` pattern matches any level) |
| `docs/baserow/` | `_baserow/docs/` |
| `scripts/baserow/` | `_baserow/scripts/` |
| `ideas/input/2026-07-30-baseroll-docker-local-setup.md` | `_baserow/ideas/` |
| `ideas/input/2026-07-30-baseroll-xstate-domain-model-first.md` | `_baserow/ideas/` |

Kept at root: `scripts/link-trae.sh` (harness, referenced by `postinstall`), `package.json`, `pnpm-lock.yaml`, `.gitignore`, `.trae/`, `ideas/` (Mata Viva vision + domain checkpoints remain project-wide).

Then update stale path references:
- [SKILL.md](file:///Users/altgoncalves/Projects/mataviva/.trae/skills/baserow-builder/SKILL.md): compose command becomes `docker compose -f _baserow/docker-compose.dev.yml exec -T backend python /baserow/backend/src/baserow/manage.py shell < _baserow/scripts/baserow/build_contact_app.py`; update the "Reference implementation" line to `_baserow/scripts/baserow/build_contact_app.py`.
- [baserow-builder-app-handsfree.md](file:///Users/altgoncalves/Projects/mataviva/.trae/documents/baserow-builder-app-handsfree.md): update the `scripts/baserow/…` path to `_baserow/scripts/baserow/…`.

Why: keeps the website repo clean at root while preserving the Baserow stack self-contained (compose + its `.env` + docs + scripts together), exactly as the user requested.

### Step B — Website static layer (`public/` + `content/`)

Create the Cloudflare Pages output directory and the Decap admin SPA:

**`public/admin/index.html`** — Decap CMS client engine (fix the spec's malformed unpkg URL `https://unpkg.com@^3.0.0/...`):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Content Manager</title>
    <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
  </head>
  <body></body>
</html>
```

**`public/admin/config.yml`** — GitHub backend, local-backend switch, path alignment (repo-relative):

```yaml
backend:
  name: github
  repo: ongmataviva/website
  branch: main
  base_url: https://ongmataviva.pages.dev  # final URL after Pages project creation

local_backend: true  # intercepts API calls when the local proxy runs

media_folder: "public/images"
public_folder: "/images"

collections:
  - name: "content"
    label: "Content Blocks"
    folder: "content"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Publish Date", name: "date", widget: "datetime" }
      - { label: "Body", name: "body", widget: "markdown" }
```

Notes:
- `repo`, `media_folder`, `public_folder`, `folder` are relative to the repo root → aligned with the new structure.
- Decap's GitHub backend derives the OAuth flow from `base_url`: `{base_url}/auth` and `{base_url}/callback`.
- `content/.gitkeep` — ensure the collection folder is tracked (git ignores empty dirs).

### Step C — Cloudflare Pages Functions (`/functions/` at repo root)

**`functions/auth.js`** — redirect to GitHub login (fix the spec's broken URL `https://github.com{client_id}...`):

```javascript
export async function onRequest(context) {
  const { env } = context;
  const client_id = env.GITHUB_CLIENT_ID;

  if (!client_id) {
    return new Response("Missing GITHUB_CLIENT_ID configuration variable.", { status: 500 });
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&scope=repo,user`;
  return Response.redirect(githubAuthUrl, 302);
}
```

**`functions/callback.js`** — exchange the code for a token and hand it to the Decap SPA via `postMessage` (fix the spec's token endpoint `https://github.com` → `https://github.com/login/oauth/access_token`; call `window.opener.postMessage` directly instead of shadowing `postMessage`):

```javascript
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Authorization code missing from callback parameters.", { status: 400 });
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return new Response(`OAuth Error: ${data.error_description || data.error}`, { status: 400 });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <body>
          <script>
            const token = "${data.access_token}";
            const provider = "github";

            window.opener.postMessage(
              "authorizing:" + JSON.stringify({ token, provider }),
              window.location.origin
            );
          </script>
        </body>
      </html>
    `;

    return new Response(htmlContent, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response(`Internal Authentication Error: ${err.message}`, { status: 500 });
  }
}
```

**Route mapping correction:** Cloudflare Pages Functions strip the `/functions` prefix — `functions/auth.js` → `/auth`, `functions/callback.js` → `/callback`. The spec's instruction to use `https://…/functions/callback` as the GitHub OAuth callback URL is **incorrect**; the plan uses `https://…/callback` (also matches Decap's default callback path).

### Step D — Local filesystem proxy (idempotent)

1. `npm install decap-cms-server --save-dev` (adds to `devDependencies`; skipped if already present).
2. Add to `package.json` `scripts` (without touching `dev`/`build`/`postinstall`):
   ```json
   "cms:proxy": "decap-server"
   ```
   The proxy listens on port **8081** by default.

### Step E — Git wiring

1. `git init -b main`
2. `git remote add origin git@github.com:ongmataviva/website.git`
3. Initial commit of the whole workspace (including `_baserow/`, excluding gitignored `.env`, `.trae/mcp.json`, volumes).
4. `git push -u origin main` (prerequisite: user's SSH key has access to `ongmataviva`).

If git identity (`user.name`/`user.email`) is not configured on this machine, ask the user for the values and pass them per-invocation (`git -c user.name=… -c user.email=…`) — persistent git config is never modified.

### Step F — Cloudflare Pages + GitHub OAuth App

**Cloudflare Pages project (assistant + user):**
1. Create the project (wrangler `wrangler pages project create ongmataviva --production-branch main`, or Cloudflare dashboard): **build command** none, **output directory** `public/`.
2. Bind environment variables in **both Production and Preview**: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (user provides the secret values; never committed).
3. Connect the GitHub repo `ongmataviva/website` to the Pages project (auto-build on push to `main`).

**GitHub OAuth App (user action, documented in plan):**
1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Homepage URL: `https://ongmataviva.pages.dev`.
3. Authorization callback URL: `https://ongmataviva.pages.dev/callback` (not `/functions/callback`).
4. Generate Client ID + Client Secret → paste into the Pages env vars.

**Final alignment:** set `base_url` in `public/admin/config.yml` to the real pages.dev URL once created.

---

## Assumptions & Decisions

- **Repo scope:** whole workspace is committed; Baserow quarantined in `_baserow/` (user decision).
- **Pages project:** created during execution (user decision); `base_url` placeholder `https://ongmataviva.pages.dev` until the project name is confirmed.
- **Scope of the CMS layer:** strictly the decoupling layer per the handoff spec — no site pages, no content model beyond the generic `content` collection (extensible later; the NGO site vision is out of scope).
- **No build system:** Cloudflare Pages publishes `public/` directly with no build command; `/admin` is served as static assets.
- **Spec corrections applied:** malformed unpkg URL, GitHub authorize URL, GitHub token endpoint URL, `/functions/callback` → `/callback` route, and the `postMessage` shadowing bug in the callback.
- **Local Baserow dev** continues to work from `_baserow/` (compose + `.env` + docs colocated).

---

## Verification

1. **Local proxy:** `npm install` then `npm run cms:proxy` → `decap-server` listens on port 8081; open `http://localhost:8081/admin` and confirm the Decap CMS UI loads (local backend).
2. **Baserow intact:** `cd _baserow && docker compose -f docker-compose.dev.yml ps` (or `docker compose -f _baserow/docker-compose.dev.yml …` from root) still resolves the stack.
3. **Git/Pages build:** after `git push`, Cloudflare Pages auto-builds from `main` with output `public/`; confirm `https://ongmataviva.pages.dev/admin` serves the CMS.
4. **OAuth handshake:** open `https://ongmataviva.pages.dev/auth` → must redirect to GitHub login; complete login and confirm the token is returned to the CMS (no console errors).
5. **Git write path:** create a test entry in the CMS → verify a `content/<slug>.md` commit appears in `ongmataviva/website` on `main`.
