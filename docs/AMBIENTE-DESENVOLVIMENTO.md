# Mata Viva — Guia de Configuração do Ambiente de Desenvolvimento

Este guia explica, passo a passo, como **replicar o ambiente de desenvolvimento** usado no projeto **Mata Viva** (site de notícias da Associação Mata Viva — região da APA Tarumã, Manaus/AM).

Para **desenvolver localmente** o site você precisa apenas de:

1. O **TRAE IDE** conectado a uma **chave de API da OpenRouter** (é a única "credencial" exigida para o dev local — ela fica na IDE, não no projeto);
2. O repositório **clonado direto do GitHub** (`ongmataviva/website`);
3. As dependências instaladas (`pnpm install`) e os comandos de dev descritos abaixo.

Nenhuma chave de GitHub, Google OAuth ou Cloudflare é necessária para o desenvolvimento local — essas só entram no **deploy para produção** (seção no final, nível "apontar e preencher").

---

## 1. Visão geral da stack

| Camada | Tecnologia |
|---|---|
| Framework do site | Astro 7 + React 19 (shell único + islands `client:only`) |
| Painel editorial (admin) | `@laikacms/decap-cms` headless (`admin-src/`) |
| Servidor local do CMS | Node (`server/index.mjs` — proxy sobre o filesystem, porta 9191) |
| Worker | Cloudflare Workers (wrangler 4) — prerender de conteúdo + login do admin |
| Data layer | Conteúdo em markdown no branch `content` do GitHub (raw em runtime) |
| Componentes/QA | Storybook 10 (offline-first com fixtures) |
| Empacotamento do admin | esbuild |

> A arquitetura completa (branches, fluxo do conteúdo, prerender, admin) está no [`README.md`](../README.md). Este guia foca só em **configurar o ambiente**.

---

## 2. Pré-requisitos

- **macOS** (ambiente usado pela equipe).
- **Node.js ≥ 22** (testado na `v22.23.1`).
- **pnpm 8** (testado na `8.6.2`): `corepack enable && corepack prepare pnpm@8.6.2 --activate` ou `npm i -g pnpm@8`.
- **git** com **SSH configurado no GitHub** (para clonar via `git@github.com:...`).
- **Conta Cloudflare** — **apenas** para deploy em produção (não é necessária no dev local).

---

## 3. TRAE IDE + OpenRouter (requisito do dev local)

O desenvolvimento deste projeto roda no **TRAE IDE**, que usa um modelo da **OpenRouter** como assistente (agente de código). Sem essa conexão, o agente não funciona — por isso é o primeiro passo.

### 3.1 Instalar o TRAE IDE

Baixe e instale o TRAE IDE em <https://www.trae.ai>.

### 3.2 Criar uma chave de API na OpenRouter

1. Acesse <https://openrouter.ai/keys> (crie a conta se ainda não tiver).
2. Clique em **Create Key** e copie a chave gerada (começa com `sk-or-...`).
3. Adicione créditos à conta, se o modelo escolhido for pago.

### 3.3 Conectar o TRAE à OpenRouter

1. Abra o TRAE IDE.
2. Vá em **Settings** (⚙️) → **Model Providers** (Fornecedores de modelo).
3. Adicione/configure o provider **OpenRouter**.
4. Cole a chave `sk-or-...` no campo de API Key.
5. Selecione o modelo desejado na lista e salve.

### 3.4 Observação importante

- Essa chave **fica na IDE** (configuração local da sua máquina) — ela **não** vai para o projeto nem para o repositório.

---

## 4. Clonar o repositório do GitHub

O repositório é **`ongmataviva/website`** (público) e tem **duas branches** com papéis distintos:

| Branch | Conteúdo |
|---|---|
| `main` | **Código** do site: `src/`, `worker/`, `admin-src/`, `server/`, `public/`, Storybook, scripts, configs |
| `content` | **Dados editoriais**: `content/**` (markdown das coleções), `data/index.json`, a Action de índice |

```bash
# 1. Clonar (branch main = código)
git clone git@github.com:ongmataviva/website.git
cd website

# 2. Baixar também a branch de dados editoriais
git fetch origin content
```

> O **editor (admin)** salva as notícias no branch `content`; o site lê esses dados via `raw.githubusercontent.com` em runtime — nunca é preciso rebuildar a cada publicação.

---

## 5. Instalar as dependências

```bash
pnpm install
```

O `postinstall` roda um script automaticamente:

- `node scripts/patch-decap-cms-encoding.mjs` — **essencial**: corrige o encoding UTF-8 do backend GitHub do admin (sem ele, o Painel corrompe acentos ao ler/gravar conteúdo).

---

## 6. Primeiro build (necessário antes de rodar o worker local)

O `wrangler dev` serve os assets estáticos de `./dist`, então é preciso buildar pelo menos uma vez:

```bash
pnpm cms:build   # bundle do admin → public/admin/cms.js
pnpm build       # astro build + copia cms.js para dist/admin/cms.js
```

---

## 7. Rodando o ambiente em desenvolvimento

| Comando | Porta | Papel |
|---|---|---|
| `pnpm cms:build:laika` | — | Rebuild do bundle do admin usado pelo dev server (obrigatório após **qualquer** mudança em `admin-src/`) |
| `pnpm cms:server` | 9191 | Dev server: proxy do CMS sobre o **filesystem** + shell do Painel. **Nunca usa GitHub/Google** — login automático, salva direto em `content/` |
| `pnpm dev:worker` | 8786 | `wrangler dev`: assets `dist/` + Worker |
| `pnpm dev` | 4545 | `astro dev` (hot reload do site) |
| `pnpm storybook` | 6106 | Storybook offline-first (fixtures) |
| `pnpm dev:all` | 9191 + 8786 | Sobe o `cms:server` e o `wrangler dev` juntos |

Fluxo típico:

```bash
pnpm install
pnpm cms:build:laika   # primeira vez (e sempre que mexer em admin-src/)
pnpm cms:server        # http://localhost:9191  → Painel (login automático)
pnpm dev:worker        # http://localhost:8786  → site com o Worker local
pnpm storybook         # http://localhost:6106  → biblioteca de componentes
```

Observações:

- **Dev local não precisa de nenhuma credencial** (nem GitHub, nem Google, nem Cloudflare): o proxy em `:9191` escreve direto nos arquivos do checkout e o Painel faz login sozinho.
- Após editar `public/admin/config.yml`, **reinicie o `pnpm cms:server`** (o proxy faz cache do config).
- Para mudar o admin em dev, use `pnpm cms:build:laika` (o `cms:build` comum gera o bundle de produção em `public/admin/cms.js`).

---

## 8. Verificando se o ambiente está OK

1. `http://localhost:9191/admin/` — o Painel abre **já logado** (sem tela de Google).
2. `http://localhost:8786` — a home carrega com o conteúdo local.
3. `http://localhost:6106` — o Storybook lista os componentes com fixtures.

---

## 9. Build e deploy para produção

> Nível "apontar e preencher": os **valores** das credenciais são fornecidos pelo time (não entram neste documento).

### 9.1 Comandos

```bash
pnpm cms:build                    # bundle do admin (produção)
pnpm build                        # astro build + copia o cms.js para dist/admin/cms.js
WRANGLER_HOME="$PWD/.wrangler-home" pnpm run deploy   # wrangler deploy
```

- URL de produção: `https://website.ongmataviva.workers.dev`
- **Importante**: o `wrangler deploy` só sobe o `dist/` — rebuildar o admin sem `pnpm build && pnpm run deploy` **não muda produção** (e o browser pode cachear o bundle antigo — faça hard reload).
- O `WRANGLER_HOME="$PWD/.wrangler-home"` evita que o wrangler grave no diretório global do usuário quando rodando via sandbox/agente.

### 9.2 Credenciais (deploy)

Usadas pelo Worker para o login do admin (Google OAuth → token do GitHub App). Em **dev**: preencha o arquivo `.dev.vars` (ignorado pelo git — modelo no commit `.env.example`). Em **produção**: `wrangler secret put <NOME>` ou dashboard Cloudflare → Workers → Variables.

| Variável | De onde vem | Uso |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud Console (OAuth app; callback `/callback`) | Login Google do Painel |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console (mesmo app) | Login Google do Painel |
| `GITHUB_APP_ID` | GitHub App em `github.com/settings/apps` | Token de instalação do GitHub App |
| `GITHUB_APP_INSTALLATION_ID` | GitHub App instalado em `ongmataviva/website` | Token de instalação do GitHub App |
| `GITHUB_APP_PRIVATE_KEY` | PEM do GitHub App, base64 (`base64 -i app.pem`) | Assinatura do JWT do GitHub App |
| `ADMIN_EMAILS` | Allowlist do time (emails separados por vírgula; fail-closed) | Quem pode entrar no `/admin` |
| `EDITORS_HMAC_KEY` | Chave HMAC arbitrária gerada pelo time | Assina a lista de editores e o cookie do admin |

---

## 10. Fluxo editorial (publicar conteúdo)

1. O editor salva no Painel → commit do `.md` no branch **`content`** (GitHub).
2. A GitHub Action regera `data/index.json` (listagens) e o bot commita o índice.
3. O site **nunca é rebuildado** — em runtime, o Worker/cliente lê os dados via `raw.githubusercontent.com`.

Para trabalhar nos dados localmente, faça checkout do branch `content` (ou use `git worktree add /tmp/mataviva-content content` para manter o checkout de código na `main`). Detalhes no [`README.md`](../README.md).

---

## Resumo rápido (checklist de dev local)

```text
☐ TRAE IDE instalado e conectado à OpenRouter (Settings → Model Providers)
☐ git clone git@github.com:ongmataviva/website.git
☐ git fetch origin content
☐ pnpm install
☐ pnpm cms:build && pnpm build
☐ pnpm cms:build:laika
☐ pnpm cms:server         → http://localhost:9191 (Painel)
☐ pnpm dev:worker         → http://localhost:8786 (site)
☐ pnpm storybook          → http://localhost:6106 (componentes)
```
