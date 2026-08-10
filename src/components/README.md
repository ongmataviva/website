# Componentes — nota de integração (design track)

Contrato de props dos componentes + desvios anotados nesta passada.
O backend é dono de `src/content.config.ts`, `astro.config.*` e das rotas `.astro`.

## 1. Props opcionais resolvidas

Os componentes abaixo recebem o **nome exibível da categoria** a partir de
`Noticia.categoria` (slug) via prop opcional `categoriasPorSlug: Record<string,
Categoria>` (slug → categoria). O `ContentApp` e o `SearchResults` já constroem
o mapa (via `useMemo`) e repassam às rotas/componentes:

| Componente | Prop | Usada para |
|---|---|---|
| `HeroSpotlight` | `categoriasPorSlug?: Record<string, Categoria>` | badge de categoria no hero |
| `NewsCard` | `categoriasPorSlug?: Record<string, Categoria>` | badge de categoria no card |
| `NewsGrid` | `categoriasPorSlug?: Record<string, Categoria>` | repassa aos `NewsCard` |
| `CategorySection` | `categoriasPorSlug?: Record<string, Categoria>` | repassa à `NewsGrid` |

Todas são **opcionais**: se ausentes, o badge de categoria é omitido e a
interface permanece íntegra. Nenhum componente assume `fetch` nem imports de
`astro:content` (Storybook offline-first via fixtures).

## 2. Observações

- `ArticleHeader` recebe `autor: Autor` além de `noticia: Noticia`, para
  renderizar o byline "Por {autor.title}" com link para `/autor/{slug}`.
  O `ArticleView` resolve o autor via `autoresPorSlug` (passado pelo
  `ContentApp`) e repassa a prop — contrato já formalizado no componente.
- `SearchResults` faz a **busca client-side**: filtra `data/index.json`
  (título/resumo/tags) sem Pagefind, com navegação por links normais
  (`/noticias/[slug]`). Pagefind foi removido do build/Layout em 2026-08-10.
