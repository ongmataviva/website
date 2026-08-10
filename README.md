# Mata Viva — site

Site de notícias da Associação Mata Viva (região da APA Tarumã / Igarapé Água Branca, Manaus/AM). Estética Ocelot: editorial minimalista, neutros quentes stone + verde amazônico.

**Arquitetura (Opção C — híbrido GitHub, 2026-08-10):** o site é um esqueleto estático que lê o conteúdo editorial de um repositório público do GitHub em runtime. Não existe rebuild a cada notícia — a publicação é só um push de markdown.

## Branches: `main` = código, `content` = dados

O repositório `ongmataviva/website` é **público** e separado em duas branches:

| Branch | Contém |
|---|---|
| `main` | Código do site: `src/`, `worker/`, `admin-src/`, `server/`, `public/`, `astro.config.mjs`, `wrangler.jsonc`, Storybook, scripts |
| `content` | Dados editoriais: `content/**` (markdown), `data/index.json`, `.github/workflows/content-index.yml`, `scripts/build-content-index.mjs` |

- O editor (admin) commita **no branch `content`** (`public/admin/config.yml` → `branch: content`).
- O worker e o cliente buscam dados via `raw.githubusercontent.com/ongmataviva/website/content/...`.
- A branch `content` não carrega `package.json`: a Action de índice instala `js-yaml` sozinha (`npm install --no-save js-yaml`).

## Como o site é servido

```
Browser / crawler
   │  GET /noticias/..., /categoria/*, /[slug], ...
   ▼
Cloudflare Worker (worker/index.ts)
   ├─ /auth, /callback        → login do admin (Google OAuth → token GitHub App)
   ├─ /images/*               → ASSETS; se 404, redireciona 302 para raw do GitHub
   ├─ rotas de conteúdo       → prerender server-side (SEO): busca dados no
   │                            GitHub (Cache API), renderiza o HTML e injeta
   │                            no shell único antes de responder
   └─ resto                   → Workers Static Assets (dist/, /admin, /_astro/*)
```

- **Shell único**: `src/pages/index.astro` renderiza `<ContentApp client:only="react">`; o router client (`src/components/content/ContentApp.tsx`) roteia por pathname e hidrata por cima do HTML pré-renderizado (substitui sem duplicar).
- **Prerender (SEO)**: `worker/content.ts` porta o markup dos componentes React (mesmas classes) + `mdToHtml`/`parseFrontmatter` e injeta `<title>`, `<meta description>` e o conteúdo dentro do `<astro-island>`. Crawlers veem a página completa; rede indisponível → shell puro 200 (nunca quebra).

## Fluxo do conteúdo (edição → publicação → leitura)

1. Editor salva no admin → commit da entrada `.md` no branch `content` (GitHub).
2. GitHub Action `.github/workflows/content-index.yml` (push em `content/**`) regera `data/index.json` (listagens: notícias, categorias, autores, páginas) e o bot commita o índice.
3. O site **nunca é rebuildado**: em runtime, o worker/cliente busca `data/index.json` (listagens) e `content/**/*.md` (artigos e páginas) via raw.

## Estrutura de pastas

```
src/                  App React/Astro: ContentApp (router), componentes de
                      notícias/layout/busca/ui, fixtures offline-first,
                      lib/remote.ts (data layer), lib/markdown.ts
worker/               Worker Cloudflare: index.ts (rotas, OAuth, imagens) +
                      content.ts (prerender server-side do conteúdo)
admin-src/            UI do painel editorial (headless core do Laika)
public/admin/         Bundle servido do admin: cms.js, config.yml, painel.css
public/images/        Mídia commitada pelo CMS (espelho no GitHub)
server/               Dev server local (proxy filesystem + shell Laika)
scripts/              patch-decap-cms-encoding.mjs (postinstall),
                      dev-all.sh, link-trae.sh (harness)
.github/workflows/    (branch content) content-index.yml
data/index.json       (branch content) índice público de listagens
```

## Rotas

- `/` home · `/noticias` · `/noticias/[slug]` · `/categoria/[slug]` · `/autor/[slug]` · `/tag/[tag]` · `/busca` · `/[slug]` (páginas institucionais: `/sobre`, `/projetos`, `/contato`) · `/admin` (painel)
- Rotas legadas do Boyuna (`/qualidade-da-agua`, `/bacia/*`, `/terrenos`, `/ocorrencias`) → **404** desde 2026-08-10.

## Admin (Decap/Laika headless)

- UI exclusiva em `admin-src/` sobre o fork headless `@laikacms/decap-cms@4.1.0-alpha.5` (`<DecapCmsProvider>` + hooks `useAuth`/`useCollection`/`useEntry`/...).
- Backend GitHub escreve no branch `content`; login via Google OAuth (`/auth` + `/callback` no worker, token de instalação do GitHub App; allowlist `ADMIN_EMAILS` fail-closed).
- Widgets: markdown (MDXEditor), imagens (MediaPicker próprio — o modal do motor não é themeable), docs, entidades `noticia`/`categoria`/`autor`/`pagina`.
- **Patch de encoding UTF-8**: `scripts/patch-decap-cms-encoding.mjs` (rodado no `postinstall`, idempotente) corrige `atob` → `TextDecoder('utf-8')` em `fetchBlobContent` do backend GitHub (senão `ç` vira `Ã§`).

## Deploy

```bash
pnpm cms:build          # bundle do admin → public/admin/cms.js
pnpm build              # astro build + cp public/admin/cms.js dist/admin/cms.js
WRANGLER_HOME="$PWD/.wrangler-home" pnpm run deploy   # wrangler deploy
```

- URL: `https://website.ongmataviva.workers.dev`
- **Importante**: `wrangler deploy` só sobe `dist/` — rebuildar o admin sem `pnpm build && pnpm run deploy` NÃO muda produção (e o browser pode cachear o bundle antigo — hard reload).

## Desenvolvimento local

| Comando | Porta | Papel |
|---|---|---|
| `pnpm cms:server` | 9191 | Dev server: proxy filesystem + shell Laika (`cms:build:laika`). **Nunca usa GitHub/Google** — escreve direto em `content/`, login automático |
| `pnpm dev:worker` | 8786 | `wrangler dev` (assets `dist/` + Worker) |
| `pnpm dev` | 4321 | `astro dev` |
| `pnpm storybook` | 6106 | Storybook offline-first (fixtures) |

Para mudar `admin-src/` no dev: `pnpm cms:build:laika` (não basta `cms:build`). Após editar `public/admin/config.yml`, reiniciar `pnpm cms:server` (o proxy faz cache do config).

## Legado removido (2026-08-10)

- **Boyuna** (qualidade da água / mapa da bacia): projeto independente (`mataviva-boyuna.pages.dev`), não é servido por este repo.
- **Baserow** (`_baserow/`): stack removida do workspace.
- Coleções legadas (`medicao`, `ponto-coleta`, `agendamento`, `contribuidor`, `bacia`, `terreno`, `ocorrencia`) e deps (`leaflet`, `geoman`, `recharts`, `decap-cms-app`) removidas do modelo de conteúdo.
