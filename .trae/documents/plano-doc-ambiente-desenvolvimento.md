# Plano — Documento `docs/AMBIENTE-DESENVOLVIMENTO.md`

## Resumo

Criar um documento **em português** em `docs/AMBIENTE-DESENVOLVIMENTO.md` que ensina a **replicar o ambiente de desenvolvimento** usado neste projeto:

- **Dev local do site exige apenas TRAE IDE + chave da OpenRouter** (configuração da IDE — decisão do usuário).
- Clonar o repositório direto do GitHub (`ongmataviva/website`, branches `main` = código e `content` = dados).
- Instalar dependências, subir o ambiente local e — no nível "apontar e preencher" — build/deploy para produção.

## Estado atual (explorado)

- Repo: `git@github.com:ongmataviva/website.git`; branches `main` (código) e `content` (dados editoriais + `data/index.json`).
- Stack: macOS, Node `v22.23.1`, pnpm `8.6.2`, Astro 7 + React 19, Storybook 10 (`:6106`), wrangler 4, esbuild, Laika/Decap CMS (`@laikacms/decap-cms@4.1.0-alpha.5`).
- **Dev local não usa segredos**: `pnpm cms:server` (`server/index.mjs`, porta 9191) implementa o proxy clássico do Decap sobre o filesystem e o Painel faz login automático — nunca toca GitHub/Google. O `wrangler dev` (`dev:worker`, porta 8786) serve assets de `./dist`.
- `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` só existem em `.env.example` (legado do assistente AI do Laika; o server atual não lê — confirmado por grep). A conexão **TRAE ↔ OpenRouter é configurada na IDE** (Settings → Model Providers), não no projeto.
- **Gotcha do harness**: `@ybyra/harness` é dependência `file:../mine/ybyra-harness` (repo git local, **sem remote** — distribuído pelo time). O `postinstall` roda `bash scripts/link-trae.sh` (que linka `../mine/ybyra-harness/pack/...` para `.trae/`) + `node scripts/patch-decap-cms-encoding.mjs` (patch UTF-8 do admin — essencial). Sem o harness em `../mine/ybyra-harness`, o `pnpm install` quebra.
- `astro.config.mjs` usa porta **4545** (README diz 4321 — desatualizado; o doc usará 4545).
- Deploy: `pnpm cms:build && pnpm build && WRANGLER_HOME="$PWD/.wrangler-home" pnpm run deploy` (o `WRANGLER_HOME` é necessário quando se roda via sandbox).

## Mudanças propostas

**Novo arquivo apenas**: `docs/AMBIENTE-DESENVOLVIMENTO.md` (README não muda). Estrutura:

1. **Visão geral** — stack resumida + link para o `README.md` (arquitetura completa).
2. **Pré-requisitos** — macOS; Node ≥ 22 (testado em `v22.23.1`); pnpm 8; git com SSH configurado no GitHub; conta Cloudflare (só para deploy).
3. **TRAE IDE + OpenRouter (requisito principal do dev local)** — primeiro tópico do documento, conforme pedido:
   - Instalar o TRAE IDE.
   - Criar chave de API em `https://openrouter.ai/keys` (prefixo `sk-or-...`).
   - TRAE → Settings → Model Providers → OpenRouter → colar a chave → selecionar o modelo desejado.
   - **Observação**: essa chave fica na IDE, não vai para o projeto. O `OPENROUTER_API_KEY` do `.env.example` é legado (assistente de chat do Laika, não usado pelo dev server atual) — pode ficar vazio.
4. **Clonar do GitHub** — `git clone git@github.com:ongmataviva/website.git` + `git fetch origin content` (explicar `main` = código / `content` = dados editoriais).
5. **Instalar dependências** — `pnpm install`:
   - Explicar o `postinstall` (link-trae.sh + patch de encoding UTF-8; o patch é indispensável para o admin não corromper acentos ao ler/escrever).
   - **Gotcha do harness**: `@ybyra/harness` é `file:../mine/ybyra-harness` — repo local privado do time; precisa existir em `../mine/ybyra-harness` (ex.: `~/Projects/mine/ybyra-harness`).
   - **Fallback sem harness**: remover a linha `"@ybyra/harness"` de `devDependencies` e a chamada `bash scripts/link-trae.sh` do `postinstall` no `package.json` (o site/worker/admin/storybook funcionam sem ele; ele só alimenta skills/commands do TRAE via `.trae/`).
6. **Primeiro build** (o `wrangler dev` serve assets de `./dist`): `pnpm cms:build` e `pnpm build`.
7. **Rodar em dev** — tabela de comandos/portas:
   - `pnpm cms:build:laika` (obrigatório após qualquer mudança em `admin-src/`)
   - `pnpm cms:server` → `http://localhost:9191` (admin local + proxy filesystem; login automático; reiniciar após editar `public/admin/config.yml` por causa do cache)
   - `pnpm dev:worker` → `http://localhost:8786` (assets `dist/` + Worker)
   - `pnpm dev` → `http://localhost:4545` (astro dev)
   - `pnpm storybook` → `http://localhost:6106` (offline-first com fixtures)
   - `pnpm dev:all` (cms:server + wrangler dev juntos)
   - Destacar: dev local nunca usa GitHub/Google.
8. **Verificação do ambiente** — smoke: abrir `:9191/admin` (Painel logado), `:8786` (site com dados locais), `:6106` (Storybook).
9. **Build e deploy (produção)** — nível "apontar e preencher":
   - Comandos: `pnpm cms:build` → `pnpm build` → `WRANGLER_HOME="$PWD/.wrangler-home" pnpm run deploy` (explicar o `WRANGLER_HOME` no sandbox).
   - Tabela de credenciais com origem de cada uma (valores fornecidos pelo time): `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (Google Cloud Console, callback `/callback`), `GITHUB_APP_ID`/`GITHUB_APP_INSTALLATION_ID`/`GITHUB_APP_PRIVATE_KEY` (GitHub App com `Contents: read & write` em `ongmataviva/website`, PEM base64), `ADMIN_EMAILS` (allowlist, fail-closed), `EDITORS_HMAC_KEY` (chave HMAC arbitrária). Dev: `.dev.vars` (ignorado pelo git); prod: `wrangler secret put` / dashboard Cloudflare.
10. **Fluxo editorial** (breve) — trabalhar no branch `content` (checkout ou `git worktree`), push → Action regera `data/index.json`; o site nunca é rebuildado. Link para o README.

## Premissas e decisões

- Dev local **não precisa de nenhuma credencial** (decisão do usuário).
- Produção documentado em nível "apontar e preencher" (decisão do usuário).
- O harness é tratado como artefato local do time; documentar também o fallback sem ele.
- Não inventar URLs/portais além dos conhecidos (`openrouter.ai/keys`, `console.cloud.google.com`, `github.com/settings/apps`, `dash.cloudflare.com`).
- Valores de segredo reais (chaves, IDs, HMAC) **não** entram no documento.

## Verificação

- Conferir que todos os comandos/portas batem com `package.json`, `astro.config.mjs` e `wrangler.jsonc` (ex.: astro dev em 4545, não 4321).
- Conferir que nenhum segredo real é citado e que o doc segue as restrições do projeto (sem `2>&1` em exemplos de terminal).
