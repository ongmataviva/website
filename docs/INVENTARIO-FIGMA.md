# Inventário do Design — Figma "Igarapé Água Branca"

**Fonte:** [3BBTiGgSye70XpevU0DzoQ](https://www.figma.com/design/3BBTiGgSye70XpevU0DzoQ/Igarap%C3%A9-%C3%81gua-Branca)
**Canvas:** 1920×5098px, 1 página ("Page 1")

---

## 1. Paleta de Cores

| Token Figma | Valor | Uso |
|---|---|---|
| `#FFFFFF` (fill_658ab2fa) | `#FFFFFF` | Fundo branco, texto em dark bg, cards |
| `#528C40` (fill_ea3bc730) | `#528C40` | **Verde acento** — botões "DOE AGORA", links ativos, destaque de texto, {ts1} |
| `#525252` (fill_08ac0d9b) | `#525252` | **Texto corporal** — cinza escuro para body |
| `#000000` (fill_34dc0314) | `#000000` | **Texto escuro** — títulos, seções, nav |
| `#333333` | `#333333` | Cabeçalhos de seção (ex.: texto hero "Conectando Comunidades...") |
| `#4B6642` | `#4B6642` | **Footer** — fundo verde escuro |
| `#F7F8FA` | `#F7F8FA` | Fundo de seção (ex.: cards Missão/Visão/Valores) |
| `#D9D9D9` | `#D9D9D9` | Placeholder de imagens |
| `#CACACA` | `#CACACA` | Linha divisória da navbar |
| `#CCCCCC` | `#CCCCCC` | Linha vertical separadora na navbar |

**Shadow:** `0px 4px 26.4px rgba(0, 0, 0, 0.12)` — sombra de cards.

---

## 2. Tipografia

| Estilo | Fonte | Peso | Tamanho | Alinhamento | Uso |
|---|---|---|---|---|---|
| style_c1d326c6 | Poppins | Regular (400) | 18px | Left | **Body text** — parágrafos, nav items |
| style_845e5bb4 | Poppins | Bold (700) | 18px | Left | **Labels** — "DOE AGORA", "SOBRE", nav labels |
| style_a15bfbbf | Poppins | Regular (400) | 16px | Center | **Card descriptions** — Missão/Visão/Valores |
| style_33697d4a | Poppins | Bold (700) | 18px | Center | **Section/card titles** — "Missão", "VER TODAS" |
| style_4cc0ff7a | Poppins | Bold (700) | 28px | — | **Hero/large text** — títulos de seção |
| style_302562df | Poppins | Regular | ~16px | — | **Footer text**, info de contato |
| style_716218ed | Poppins | Regular | ~14px | — | **Info pequena** — dados bancários |
| Inline hero heading | Poppins | Bold (700) | 28px | Left | "Conectando Comunidades..." |
| Nav inline | Poppins | Medium (500) | 16px | Left | "SOBRE NÓS", "NOSSO PROJETOS" |

**Conclusão:** Figma usa **Poppins como única fonte** (sem Georgia, sem Inter). 3 pesos: Regular (400), Medium (500), Bold (700). Tamanhos: 14–28px.

---

## 3. Estrutura de Layout (top→bottom)

O design é uma página longa (`1920×5098px`) com as seguintes seções:

```
┌─────────────────────────────────────┐
│  NAVBAR                              │ 122px
│  INÍCIO | SOBRE | CAUSAS | NOTÍCIAS  │
│  CONTATO | Buscar  [DOE AGORA]       │
├─────────────────────────────────────┤
│  HERO                                │
│  Imagem grande à esquerda (961×512)  │
│  "Conectando Comunidades              │
│   Pela Preservação Ambiental"         │
│  Texto corporal + CTA                │
├─────────────────────────────────────┤
│  SEÇÃO "O QUE FAZEMOS?"              │
│  Cards: Plantio de Mudas Nativas      │
│         Projeto Trilha Ecológica      │
│         Monitoramento Online          │  fundo F7F8FA
├─────────────────────────────────────┤
│  SEÇÃO MISSÃO / VISÃO / VALORES      │
│  3 cards lado a lado (384×490)       │  ​
├─────────────────────────────────────┤
│  "Últimas Notícias" [VER TODAS]      │
│  Grid de cards de notícias           │
├─────────────────────────────────────┤
│  FRASE DESTAQUE                      │
│  "Lutamos diariamente..."            │
├─────────────────────────────────────┤
│  CAUSAS (Trilha / Plantio / Monitor) │
│  Cards com ícone + descrição         │
├─────────────────────────────────────┤
│  SEÇÃO DE PROJETOS                   │
│  "Descubra a Natureza"               │
│  "Florescendo na Cidade"             │
├─────────────────────────────────────┤
│  PARCEIROS / APOIADORES              │
├─────────────────────────────────────┤
│  PÁGINA DE DOAÇÃO                    │
│  "Salve o Água Branca!"              │
│  Dados bancários + PIX               │
├─────────────────────────────────────┤
│  FOOTER verde escuro (#4B6642)       │
│  Contato, Portal, Redes              │
│  "ONG MATA VIVA"                     │
└─────────────────────────────────────┘
```

---

## 4. Assets (imagens)

| Imagem | ID | Dimensões | Uso |
|---|---|---|---|
| Hero principal | 69dc132a2fa… | 974×811 | Foto grande no hero |
| Projeto 1 | a85b160980e… | 811×593 | "Descubra a Natureza" |
| Projeto 2 | 399da623759… | 1475×821 | "Florescendo na Cidade" |
| Projeto 3 | 96476b04cd8… | 770×355 | Projeto 3 |
| Igarapé banner | 7cad68b8a4d… | 1342×766 | Banner seção |
| Parceiros | 28d464d285c… | 1903×491 | Banner parceiros |
| Apoiador | e641a6dd30e… | 667×702 | Card apoiador |
| Fundo background | 6484105c8fa… | 1920×2880 | Background de seção |
| Logo (SVG) | "Group" #328:42 | 175×51.74 | Logo no navbar |
| MagnifyingGlass | SVG #328:34 | 32×32 | Ícone de busca |
| MapPin, Clock, etc. | templates | 42×42 | Ícones SVG no footer |
| Instagram, etc. | SVG | 32×32, 48×48 | Ícones redes sociais |

---

## 5. Componentes do Navbar

- **Logo** à esquerda (175×51.74)
- **Links:** INÍCIO | SOBRE | CAUSAS (ativo = verde `#528C40`) | NOTÍCIAS | CONTATO
- **Busca:** ícone lupa (32×32) + texto "Buscar"
- **Separador:** linha vertical `#CCCCCC`
- **Botão CTA:** "DOE AGORA" — fundo `#528C40`, borderRadius 8px, texto branco
- **Linha divisória:** `#CACACA` no final da navbar

---

## 6. Estado do Site Atual vs. Figma

| Aspecto | Atual (tokens.css) | Figma | Impacto |
|---|---|---|---|
| **Fonte display/serif** | Georgia | Poppins Bold (700) | Trocar + self-host woff2 |
| **Fonte body/sans** | Inter | Poppins Regular (400) | Trocar + self-host woff2 |
| **Cor acento** | `#3f6b4f` | `#528C40` | Ajustar |
| **Cor ink (texto)** | `#26221c` | `#333333` / `#525252` / `#000000` | Ajustar (mais de um tom) |
| **Cor paper** | `#faf9f6` | `#FFFFFF` | Ajustar |
| **Botão arredondamento** | 8px | 8px | Ok |
| **Estrutura** | Shell + ContentApp router | Página longa única | Casamento próximo |
| **Navbar** | Atual com NavBar | INÍCIO/SOBRE/CAUSAS/NOTÍCIAS/CONTATO | Ajustar links + CTA |
| **Grid cards** | NewsGrid + NewsCard | Grid de cards de notícias | Similar (validar) |
| **Footer** | Atual com Footer | Dados contato + PIX + redes | Expandir |

**Novos elementos (não existem no site atual):**
- Botão "DOE AGORA" fixo no navbar
- Seção de doação com dados bancários e PIX
- Cards de Missão/Visão/Valores
- Parceiros/Apoiadores

**Campos não previstos no modelo atual:**
- Dados de doação (não é campo de conteúdo — talvez página institucional)
- Parceiros (talvez nova coleção `parceiro`)

---

## 7. Decisões pós-inventário

1. **Fonte Poppins** precisa ser baixada (Regular 400, Medium 500, Bold 700) em woff2 e hospedada em `public/fonts/`.
2. **Cor acento** muda de `#3f6b4f` → `#528C40`.
3. **Cor de fundo** muda de stone quente `#faf9f6` → branco puro `#FFFFFF`.
4. **Paleta de texto** se expande: os 3 tons (`#000000` títulos, `#525252` body, `#333333` headings maiores).
5. **Footer** ganha fundo verde escuro `#4B6642` com texto branco.
6. **Seção de doação** com dados bancários/PIX — conteúdo gerenciável como página institucional ou nova coleção? Decisão do usuário.
7. **Novos campos visuais** (ícones SVG, imagens de parceiros) — sem impacto no admin, são assets estáticos.
8. **MCP Figma** operacional via CLI — pode ser usado sob demanda para download de assets (`download_figma_images`).