# Plano — Redesign Figma "Igarapé Água Branca" no Site Mata Viva

## Resumo

Implementar a identidade visual do arquivo Figma [`Igarapé Água Branca`](https://www.figma.com/design/3BBTiGgSye70XpevU0DzoQ/Igarap%C3%A9-%C3%81gua-Branca?node-id=0-1&t=4vXB9eGR1O7bcpP9-1) no site público do Mata Viva, mantendo a infraestrutura de administração intacta (coleções, login, publicação). O trabalho é dividido em **5 milestones (M1–M5)**, com Storybook como driver de desenvolvimento, revisão incremental no browser e deploy único pós-aceite.

**Branch:** `feat/figma-redesign` a partir de `main`. Deploy para produção só após aprovação final.

---

## Estado atual (analisado)

### Stack visual

- **Tokens:** `src/styles/tokens.css` (121 linhas) — paleta stone + verde amazônico (`--color-paper` #faf9f6, `--color-accent` #3f6b4f, `--color-ink` #26221c...), escala editorial (`--text-display` 3rem → `--text-caption` 0.8125rem), fontes declaradas (Inter, Georgia, JetBrains Mono) mas **nunca carregadas** (sem `@font-face`, sem CDN).
- **Fontes são fallback do sistema:** se o visitante não tem Inter instalada, cai para `-apple-system`/Helvetica. Georgia (serif) é nativa do macOS/Windows. JetBrains Mono cai para Fira Code ou monospace genérico.

### Componentes React (18 componentes)

| Grupo | Componentes |
|---|---|
| `src/components/news/` | HeroSpotlight, NewsGrid, NewsCard, CategorySection, CategoryHeader, AuthorCard, AuthorByline, ArticleHeader, ArticleBody, TagList |
| `src/components/layout/` | NavBar, Footer, SiteShell |
| `src/components/ui/` | Badge, Button |
| `src/components/content/` | ContentApp (router client-side) |
| `src/components/` | PageShell |
| `src/components/search/` | SearchResults |

Cada componente tem `.tsx` + `.css` (CSS plano com classes BEM-like) + `.stories.tsx` + `.stories.tsx` + `.css` para Storybook. **Nenhum escopo de estilos** (CSS puro, sem modules/CSS-in-JS).

### Worker (prerender SEO)

`worker/content.ts` — **726 linhas**, **14 funções de template HTML** que duplicam o markup dos componentes React como strings HTML (`newsCardHTML`, `heroHTML`, `articleHTML`, `categorySectionHTML`, `homeViewHTML`...). Qualquer mudança de classe/estrutura nos componentes React precisa ser **espelhada** no worker, senão o prerender quebra.

### Painel admin

`public/admin/painel.css` (~1456 linhas) — tem **sua própria cópia** do sistema de design com valores **ligeiramente divergentes** de `tokens.css`:
- `--color-surface-muted`: #ebe8e0 (painel) vs #e9e5dd (tokens)
- `--color-ink-soft`: #57534e (painel) vs #55503f (tokens)
- `--color-accent-strong`: #33584a (painel) vs #2c4d3a (tokens)
- Painel tem `--space-5`/`--space-10` que não existem nos tokens; faltam `--space-20`/`--space-24`
- Sombras com nomes diferentes (`--shadow-card`/`--shadow-float` vs `--shadow-soft`/`--sm`/`--md`/`--lg`)

### Fixtures (Storybook)

`src/components/fixtures/` — dados mockados para as 5 coleções (`nav`, `noticias`, `autores`, `categorias`, `paginas`), cada uma exportando listas e mapas por slug. O Storybook offline-first lê esses fixtures, sem depender de rede.

### MCP Figma

Já configurado no `.trae/mcp.json` com PAT do usuário. O arquivo Figma é `https://www.figma.com/design/3BBTiGgSye70XpevU0DzoQ/Igarap%C3%A9-%C3%81gua-Branca` (file key: `3BBTiGgSye70XpevU0DzoQ`).

---

## Decisões da sessão de grilling (árvore completa)

| Nó | Decisão |
|---|---|
| **Acesso** | MCP Figma (`figma-developer-mcp`, stdio) com PAT do usuário |
| **Escopo** | Redesenhar a biblioteca de componentes existente |
| **Cobertura** | Site público completo (home, artigo, categoria, autor, busca, páginas institucionais) |
| **Admin** | Infra intacta; visual só via tokens no `painel.css` (layout e funcionalidades inalterados) |
| **Tokens** | Mapear manual do Figma para `src/styles/tokens.css` |
| **Fontes** | Self-host (woff2 no repo, fora de `public/`) |
| **Conteúdo** | Visual-only por padrão; novos campos permitidos **com aprovação explícita por campo** |
| **Responsivo** | Adaptar responsivamente se o Figma não tiver telas mobile |
| **Git** | Branch `feat/figma-redesign`, deploy pós-aceite |
| **Validação** | Revisão incremental (Storybook + browser local) |
| **Sequência** | M1..M5, Storybook como driver |

---

## Milestones

### M1 — Conectar MCP Figma + Inventário do Design

**Objetivo:** validar que o servidor Figma está operacional, extrair todo o vocabulário de design do arquivo e produzir um inventário antes de tocar em código.

Tarefas:

1. **Verificar conexão MCP** — chamar as tools do `figma-developer-mcp` para confirmar que o servidor responde.
2. **Extrair estrutura do arquivo** — usando as tools MCP, obter:
   - Lista de páginas e frames do documento.
   - Paleta de cores (fills, strokes) de cada frame relevante.
   - Hierarquia tipográfica (font-family, font-size, font-weight, line-height).
   - Espaçamento e dimensões de elementos-chave.
   - Assets (logo, ícones, ilustrações) — exportar via `get_image` se aplicável.
3. **Mapear Figma → componentes existentes** — tabela ligando cada frame do Figma ao componente React correspondente (ex.: "frame Home Hero → HeroSpotlight", "frame Card Notícia → NewsCard").
4. **Decidir sobre novos campos** — se o design usar dados que não existem no modelo atual (ex.: selo "patrocinado", campo de subtítulo, classificação), listar e pedir aprovação do usuário **antes** de M2.
5. **Inventário de fontes** — verificar quais fontes o Figma usa (ex.: Inter, Playfair Display, alguma variante de peso) e se há pesos/extensões não cobertos atualmente.

**Entregável:** inventário documentado no `docs/INVENTARIO-FIGMA.md`.

**Verificação:** MCP retorna dados do arquivo; inventário aprovado pelo usuário.

---

### M2 — Design Tokens + Fontes Self-Host

**Objetivo:** traduzir o vocabulário visual do Figma para o código, começando pela camada base (tokens e fontes), antes de mexer em componentes.

Tarefas:

1. **Atualizar `src/styles/tokens.css`:**
   - Mapear cada cor do Figma para uma variável `--color-*`, mantendo a nomenclatura atual onde houver equivalência.
   - Atualizar a escala tipográfica (`--text-*`) para casar com o Figma (tamanhos, pesos, line-height).
   - Atualizar `--font-display` e `--font-body` com as fontes exatas do Figma.
   - Ajustar `--space-*`, `--radius-*`, `--shadow-*` conforme o Figma.
   - Adicionar novas variáveis se o design introduzir conceitos ausentes.
2. **Fontes self-host:**
   - Baixar os arquivos `.woff2` das fontes usadas no Figma (Inter, ou qualquer outra).
   - Colocar em `public/fonts/` (servido como asset estático).
   - Adicionar `@font-face` declarations no começo de `tokens.css`:
     ```css
     @font-face {
       font-family: 'Inter';
       src: url('/fonts/Inter-Regular.woff2') format('woff2');
       font-weight: 400;
       font-style: normal;
     }
     ```
   - Repetir para cada peso usado (400, 500, 600, 700...).
3. **Sincronizar `public/admin/painel.css`:**
   - Atualizar as variáveis coincidentes no painel para os mesmos valores de `tokens.css`.
   - **Não** mexer nos tokens de compatibilidade do Decap/Laika (`--background`, `--foreground`, `--primary`, etc.) — são consumidos internamente pelo motor e não devem ser realinhados com o redesign visual.
   - Remover divergências identificadas (ex.: `--color-surface-muted`, `--color-line` com valores hex fixos vs rgba).
4. **Sincronizar fontes no painel:**
   - Adicionar os mesmos `@font-face` no início de `painel.css` (ou importar de `tokens.css` via `@import`, se viável — mas são estilos em domínios diferentes, então repetir as declarações).

**Entregável:** `tokens.css` e `painel.css` atualizados com os valores do Figma; fontes servidas localmente.

**Verificação:** Storybook aberto com tokens novos (cores e tipografia aplicadas); painel `/admin` com as novas cores.

---

### M3 — Componentes (Storybook como driver)

**Objetivo:** redesenhar cada componente React individualmente, validando visualmente no Storybook antes de integrar nas páginas.

Tarefas:

1. **Ordem de redesign (dependências):**
   1. `Button`, `Badge` (ui atômicos)
   2. `NavBar`, `Footer`, `SiteShell` (layout — impactam todas as páginas)
   3. `NewsCard`, `NewsGrid`, `HeroSpotlight` (home)
   4. `CategoryHeader`, `CategorySection` (listagens)
   5. `ArticleHeader`, `ArticleBody`, `AuthorByline`, `AuthorCard`, `TagList` (artigo)
   6. `PageShell`, `SearchResults` (páginas)
2. **Para cada componente:**
   - Atualizar `.tsx` (estrutura/JSX) para casar com o frame do Figma.
   - Reescrever `.css` usando os novos tokens (`--color-*`, `--font-*`, `--space-*`).
   - Manter as props/interface existentes — **não quebrar contratos**.
   - Atualizar `.stories.tsx` se necessário (variações visuais novas).
   - Verificar no Storybook (`pnpm storybook`) que o componente renderiza corretamente em todos os estados.
3. **Responsividade:** ajustar CSS com `@media` queries nos breakpoints que o Figma definir; se não houver frames mobile, adaptar com bom senso (stack vertical, menu hamburger, grid 1-col).
4. **Atualizar fixtures** se o design introduzir novos campos visuais (ex.: subtítulo, selo).

**Entregável:** todos os 18 componentes redesenhados, validados no Storybook.

**Verificação:** `pnpm storybook` → cada história visualmente aprovada.

---

### M4 — Páginas + Worker Prerender + Painel

**Objetivo:** integrar os componentes redesenhados nas páginas do site, sincronizar o prerender do worker e aplicar os tokens no admin.

Tarefas:

1. **Integrar componentes em `ContentApp.tsx`:**
   - `ContentApp` monta 8 componentes de `news/` + `PageShell` — verificar que os imports estão atualizados e as props passadas corretamente.
   - Testar cada rota: `/` (home), `/noticias`, `/noticias/[slug]`, `/categoria/[slug]`, `/autor/[slug]`, `/tag/[tag]`, `/[slug]` (páginas institucionais), `/busca`.
2. **Sincronizar worker `content.ts`:**
   - Para cada função HTML no worker, atualizar as classes CSS e estrutura do markup para espelhar os componentes React redesenhados.
   - Funções a sincronizar (14 no total): `newsCardHTML`, `newsGridHTML`, `heroHTML`, `categorySectionHTML`, `categoryHeaderHTML`, `authorCardHTML`, `articleHTML`, `pageShellHTML`, `notFoundHTML`, `homeViewHTML`, `noticiasViewHTML`, `categoriaViewHTML`, `autorViewHTML`, `tagViewHTML`.
   - Atualizar `injectIntoShell`, `shellWith`, `shellNotFound`, `shellFallback` se houve mudança na estrutura do `SiteShell`.
   - Atualizar as funções de parsing de markdown se o design introduzir nova semântica (ex.: classes em `mdToHtml`).
3. **Sincronizar CSS do painel:**
   - Verificar que `painel.css` está com os mesmos `--color-*` e `@font-face` definidos em M2.
   - **Não** alterar o layout do painel (login, barra lateral, listas, editor) — só as variáveis CSS e fontes.
   - Verificar que o motor Decap/Laika continua renderizando corretamente com os novos tokens de compatibilidade inalterados.
4. **Smoke test das rotas:**
   - Subir `pnpm dev:worker` (porta 8786).
   - `curl -s http://localhost:8786/ | grep '<title>'` → título prerenderizado correto.
   - `curl -s http://localhost:8786/sobre | grep -o 'class="[^"]*"' | head -5` → classes dos componentes aparecem.
   - `curl -s http://localhost:8786/nao-existe -o /dev/null -w '%{http_code}'` → 404.
5. **Verificar hidratação:** abrir `http://localhost:8786` no browser, inspecionar que o React hidrata sem duplicar o conteúdo (console sem warnings de hydration mismatch).

**Entregável:** site funcionando com o novo design no browser local; admin com os novos tokens.

**Verificação:** todas as rotas testadas (curl + browser); admin acessível e funcional; console limpo.

---

### M5 — QA + Deploy

**Objetivo:** revisão final, correções pontuais e deploy para produção.

Tarefas:

1. **QA completo:**
   - Percorrer todas as rotas no browser (`:8786`): home, artigo, categoria, autor, tag, busca, 404.
   - Verificar responsividade (redimensionar janela: desktop, tablet, mobile).
   - Verificar quebra de texto, espaçamento, imagens, links.
   - Verificar admin: login `/admin`, criar/editar/salvar uma notícia, categoria, autor e página.
2. **Resolver issues:** ajustes finos de CSS/tipografia que só aparecem no browser real.
3. **Preparar o branch:**
   - `git checkout -b feat/figma-redesign` (a partir de `main`).
   - Commits por milestone (ou um squash limpo por milestone).
4. **Deploy de produção:**
   - `pnpm cms:build && pnpm build && WRANGLER_HOME="$PWD/.wrangler-home" pnpm run deploy`.
   - Smoke test em `https://website.ongmataviva.workers.dev` — mesmas verificações do QA local.
   - Hard reload no browser (Cmd+Shift+R) para limpar cache do bundle do admin.
5. **Integrar na main:** merge do branch após aprovação.

**Entregável:** site redesenhado em produção.

**Verificação:** QA local + smoke em produção + admin funcional.

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| **MCP Figma não carregar** (sessão do TRAE sem o servidor) | Habilitar na UI do TRAE (Settings → MCP); reiniciar IDE; testar com chamada de tool antes de M1 |
| **License das fontes** (Inter é OFL, ok; outras fontes podem ter restrições) | Verificar licença antes de baixar; usar CDN (Google Fonts) como fallback se self-host for inviável |
| **Worker fica fora de sync** (726 linhas, 14 funções HTML) | M4 dedica tarefa exclusiva de sincronização; verificar com curl + greps por classes |
| **Novos campos de conteúdo** podem tocar `config.yml` e o admin | Decisão do grilling: novos campos só com aprovação explícita do usuário, um por um |
| **Hidratação com mismatch** (React vs HTML prerenderizado) | M4 smoke test: verificar console sem warnings de hydration |
| **Divergência painel.css × tokens.css** (valores diferentes já existem) | M2 unifica os valores coincidentes; tokens de compatibilidade do Decap/Laika ficam intocados |

---

## Estrutura de branches

```
main
  └── feat/figma-redesign  ← todo o trabalho aqui
                              └── commits por milestone (M1..M5)
                              └── merge só após aceite final
```

---

## Ordem sugerida de execução

1. M1 (validação + inventário)
2. M2 (tokens + fontes)
3. M3 (componentes no Storybook)
4. M4 (páginas + worker + painel)
5. M5 (QA + deploy)