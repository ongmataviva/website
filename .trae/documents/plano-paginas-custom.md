# Plano — Páginas Sobre e Projetos como páginas customizadas

## Resumo

Substituir as rotas `/sobre` e `/projetos` (atualmente mapeadas para o genérico `PageShell` que busca `.md` do CMS remoto) por **páginas React customizadas** com conteúdo hard-coded extraído diretamente do arquivo Figma "Igarapé Água Branca". As outras páginas (contato, etc.) permanecem como estão.

**Novo componente:** `src/components/pages/Sobre.tsx` e `src/components/pages/Projetos.tsx` com layouts específicos do Figma (blocos de texto, imagens, grid de projetos), usando os novos tokens CSS do redesign.

---

## Estado atual

| Aspecto | Situação |
|---|---|
| Rota `/sobre` | ContentApp → `parseRoute('/sobre') = {kind:'pagina'}` → `PageView` fetch `content/sobre.md` via raw → `PageShell`. Nenhum .md existe na branch `content` → aparece "Página não encontrada" |
| Rota `/projetos` | Mesmo fluxo que sobre |
| Componente PageShell | Genérico: título + imagem opcional + corpo HTML (`dangerouslySetInnerHTML`) |
| Links de navegação | `navLinks` inclui `{Sobre: /sobre}`, `{Contato: /contato}`, `{Projetos: /projetos}` mas sem conteúdo real |
| Conteúdo atual | Só fixtures HTML mock em `src/components/fixtures/paginas.ts` |
| Templates Astro | Apenas `/` e `/busca`; tudo via ContentApp router |
| Worker prerender | Todas as rotas `/{slug}` passam pelo prerender em `worker/content.ts` |

---

## Decisões da sessão de grilling

| Nó | Decisão |
|---|---|
| **Páginas customizadas** | Sobre + Projetos (e possivelmente Contato — depende do que está no Figma) |
| **Fonte de verdade** | Arquivo Figma "Igarapé Água Branca" |
| **Conteúdo** | Textos exatos do Figma, layout dos frames, ordem das seções |
| **CMS** | Não toca — mantemos Notícias intactas, apenas substituímos Sobre/Projetos |

---

## Mudanças propostas

### 1. Criar diretório `src/components/pages/`

Novos componentes de página:

```
src/components/pages/
├── Sobre.tsx         # Página Sobre completa
├── Sobre.css         # Estilos específicos (se necessário)
├── Projetos.tsx      # Página Projetos completa
├── Projetos.css      # Estilos específicos
└── index.ts          # Re-export
```

#### 1a. `Sobre.tsx` — estrutura prevista (confirmar no Figma)

Baseado no inventário do Figma (canvas 1920×5098px), a página Sobre provavelmente tem uma sequência de blocos:

```tsx
export function Sobre() {
  return (
    <div className="mv-page-sobre">
      {/* Hero da página */}
      <section className="mv-page-sobre__hero">
        <h1>Sobre o Mata Viva</h1>
        {/* Imagem/parágrafo introdutório conforme Figma */}
      </section>

      {/* Seção história/origem */}
      <section className="mv-page-sobre__section">
        <h2>Nossa história</h2>
        <p>Texto extraído do Figma...</p>
      </section>

      {/* Seção equipe/bio */}
      <section className="mv-page-sobre__team">
        <h2>Quem somos</h2>
        {/* Cards de membros se houver no Figma */}
      </section>

      {/* Continuar conforme extrair do Figma... */}
    </div>
  );
}
```

#### 1b. `Projetos.tsx` — estrutura prevista

```tsx
export function Projetos() {
  return (
    <div className="mv-page-projetos">
      <section className="mv-page-projetos__hero">
        <h1>Nossos Projetos</h1>
        {/* Intro visual do Figma */}
      </section>

      {/* Grid ou lista de projetos */}
      <section className="mv-page-projetos__grid">
        <ProjectCard titulo="Trilha Ecológica" descricao="..." img="..." />
        <ProjectCard titulo="Plantio de Mudas" descricao="..." img="..." />
        <ProjectCard titulo="Monitoramento Online" descricao="..." img="..." />
      </section>

      {/* Seção detalhes/call-to-action conforme Figma */}
    </div>
  );
}
```

### 2. Atualizar `ContentApp.tsx` — rotear Sobre/Projetos para componentes customizados

Na função `parseRoute`:

```tsx
if (segs.length === 1) {
  if (segs[0] === 'noticias') return { kind: 'noticias' };
  if (segs[0] === 'doar' || segs[0] === 'doacao') return { kind: 'pagina', slug: 'doar' };
  // NOVAS rotas customizadas
  if (segs[0] === 'sobre') return { kind: 'custom', page: 'sobre' };
  if (segs[0] === 'projetos') return { kind: 'custom', page: 'projetos' };
  return { kind: 'pagina', slug: segs[0] };  // contatos e outros continuam como antes
}
```

No switch `ContentView`:

```tsx
case 'custom':
  if (route.page === 'sobre') return <Sobre />;
  if (route.page === 'projetos') return <Projetos />;
  return <NotFoundView />;
```

Importar os novos componentes no topo do arquivo.

### 3. Atualizar `worker/content.ts` — prerender das novas rotas

Adicionar handlers nos views do prerender:

```typescript
case 'custom':
  if (route.page === 'sobre') return renderCustomPage('sobre');
  if (route.page === 'projetos') return renderCustomPage('projetos');
  return shellNotFound();
```

As funções `renderCustomPage` geram o mesmo HTML que os componentes React retorna, injetando no shell padrão. Isso garante SEO no servidor.

### 4. (Opcional) Adicionar rota `/contato` como customizada

Se o Figma tiver uma tela de contato específica, aplicar mesma abordagem. Caso contrário, manter o `PageShell` genérico (que ainda pode ter um markdown criado manualmente depois).

---

## Tarefas detalhadas

### Tarefa A — Extrapolação manual do conteúdo do Figma

Como o rate limit da API bloqueou nossa tentativa programática, precisamos extrair manualmente do Figma os seguintes dados para cada página:

**Para Sobre:**
1. Título principal da página
2. Texto/parágrafos (quantos, conteúdos exatos)
3. Ordens/seções (ex.: história → missão → equipe → valores)
4. Imagens associadas (IDs de frames/imagem para exportar via MCP)
5. Links ou CTAs presentes

**Para Projetos:**
1. Lista de projetos (nomes, descrições, quantos)
2. Imagens de capa de cada projeto
3. Layout (grid, cards, lista vertical?)
4. CTA final ("Quer saber mais?" / links externos)

**Decisão pendente:** esses dados serão fornecidos por você (copiar/colar do Figma) ou tentamos novamente com wait para o rate limit baixar?

### Tarefa B — Implementar componentes `Sobre.tsx` e `Projetos.tsx`

Segundo o inventário do Figma:
- Fonte única: **Poppins** (já self-hosted em `public/fonts/`)
- Cores: fundo branco `#FFFFFF`, verde acento `#528C40`, textos `#333333`/`#525252`/`#000000`
- Cards com sombra `var(--shadow-md)` e borderRadius `8px`
- Espacamento via tokens `--space-*`
- Tipografia: body 18px (Poppins Regular), títulos 24-28px (Poppins Bold)

Os componentes consumirão strings hard-coded (textos do Figma) em vez de props externas.

### Tarefa C — Atualizar ContentApp.tsx

Modificações mínimas na função `parseRoute` e no switch `ContentView`. Manter compatibilidade com todas as outras rotas existentes.

### Tarefa D — Sincronizar worker prerender

Espelhar os mesmos caminhos HTML no worker, garantindo que crawlers recebam o conteúdo completo (SEO).

### Tarefa E — Build + deploy

```bash
pnpm cms:build && pnpm build && WRANGLER_HOME="$PWD/.wrangler-home" pnpm run deploy
```

### Tarefa F — Verificação

- Abrir `http://localhost:8786/sobre` e `/projetos` localmente
- Verificar title, h1, textos, imagens, espaçamento
- curl headless para validar prerender

---

## Arquivos a modificar

| Arquivo | Tipo | Mudança |
|---|---|---|
| `src/components/pages/Sobre.tsx` | **NOVO** | Página Sobre hardcoded |
| `src/components/pages/Sobre.css` | **NOVO** | Estilos específicos |
| `src/components/pages/Projetos.tsx` | **NOVO** | Página Projetos hardcoded |
| `src/components/pages/Projetos.css` | **NOVO** | Estilos específicos |
| `src/components/content/ContentApp.tsx` | EDITAR | Rotas `custom.sobre`, `custom.projetos` |
| `worker/content.ts` | EDITAR | Prerender das novas rotas |
| `src/lib/remote.ts` | EDITAR | Remove imports/exports não usados (Doacao, Parceiro podem ser removidos se não mais necessários) |

---

## Suposições

1. O layout do Figma para Sobre/Projetos cabe dentro de max-width page (72rem / var(--max-width-page))
2. Os textos do Figma são finais — não precisaremos iterar após portar
3. As imagens do Figma (se houver) podem ser baixadas/exportadas e servidas como assets estáticos
4. Não mudamos a estrutura de navegação (links já existem no navLinks)
5. O worker prerender segue o mesmo schema de classes CSS dos componentes React

---

## Ordem sugerida

A. Extrair textos/imagens do Figma (manual ou retry MCP com cooldown)
B. Criar `src/components/pages/` com Sobre.tsx + Projetos.tsx
C. Atualizar ContentApp.tsx
D. Atualizar worker/content.ts
E. `pnpm build && pnpm run deploy`
F. Smoke test nas rotas
