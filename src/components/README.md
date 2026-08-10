# Componentes — nota de integração (design track)

Contrato de props do backend (recipe §4) + desvios anotados nesta passada.
O backend é dono de `src/content/config.ts`, `astro.config.*` e das rotas `.astro`.

## 1. Props necessárias que não existem no contrato (§7)

Os componentes abaixo precisam resolver o **nome exibível da categoria** a
partir de `Noticia.categoria` (slug). O contrato atual não prevê isso — as
rotas passam apenas `noticia: Noticia`.

> **Pedido ao backend:** passar uma prop opcional `categoriasPorSlug:
> Record<string, Categoria>` (slug → categoria) às seguintes rotas, ou
> injetar o nome da categoria dentro da `Noticia` antes de passá-la.

| Componente | Prop ausente no contrato | Usada para |
|---|---|---|
| `HeroSpotlight` | `categoriasPorSlug?: Record<string, Categoria>` | badge de categoria no hero |
| `NewsCard` | `categoriasPorSlug?: Record<string, Categoria>` | badge de categoria no card |
| `NewsGrid` | `categoriasPorSlug?: Record<string, Categoria>` | repassa aos `NewsCard` |
| `CategorySection` | `categoriasPorSlug?: Record<string, Categoria>` | repassa à `NewsGrid` |

Todas são **opcionais**: se ausentes, o badge de categoria é omitido e a
interface permanece íntegra. Nenhum componente assume `fetch` nem imports de
`astro:content`.

## 2. Observações

- `ArticleHeader` recebe `autor: Autor` além de `noticia: Noticia`, para
  renderizar o byline "Por {autor.title}" com link para `/autor/{slug}`.
  O contrato §4 lista apenas `noticia: Noticia` — considere formalizar a prop.
- `SearchBox` inicializa o Pagefind (`window.PagefindUI`) quando disponível;
  sem Pagefind cai num formulário que navega para `/busca?q={query}`.
