# Plan — Kuma AI Prompts para o Schema Baserow (MataViva)

## Summary

Create a set of PT-BR markdown prompt files in the repo that the user pastes into **Kuma AI** (Baserow's native assistant) to create the 7 domain tables in the MataViva database. After each table is created, verify it via the **`mcp_baserow`** MCP server (`list_tables` + `get_table_schema`), and if Kuma misbehaves, provide corrective prompts.

The MCP server itself cannot create tables/fields (row CRUD + listing only) — confirmed during exploration. Kuma AI in the UI is the chosen schema-creation mechanism.

## Current State Analysis

- Baserow 2.3.3 self-hosted at `http://localhost:8484` (Caddy → backend), reachable and configured.
- MCP bridge working: Trae stdio → `mcp-remote` → SSE → Caddy → backend ([.trae/mcp.json](file:///Users/altgoncalves/Projects/mataviva/.trae/mcp.json)).
- Database **MataViva** (id 1) contains one bare table **Projects** (id 1, only a primary "Name" field) — exists today, not part of the domain model.
- MCP tools available: `list_databases`, `list_tables`, `get_table_schema`, `list_table_rows`, `create_rows`, `update_rows`, `delete_rows`. **No schema-creation tools.**
- Ideas read: [2026-07-30-mata-viva-domain-communication-reuniao.md](file:///Users/altgoncalves/Projects/mataviva/ideas/input/2026-07-30-mata-viva-domain-communication-reuniao.md) (Communication/Meeting), [2026-07-30-mata-viva-sistema-apoio-ong.md](file:///Users/altgoncalves/Projects/mataviva/ideas/input/2026-07-30-mata-viva-sistema-apoio-ong.md) (basin, owners, occurrences, public communication), handoff doc (entity list).

## Decisions (grilled & confirmed)

| # | Decision | Choice |
|---|---|---|
| 1 | Schema creation mechanism | **Kuma AI in the UI** (prompts as real `.md` files in repo) |
| 2 | Entity scope | **All 7**: Comunicação, Reunião, Contato, Proprietário, Parcela, Bacia Hidrográfica, Ocorrência |
| 3 | Meeting is-a Communication | **Separate Meeting table + Link to Comunicação** (one-to-one parent) |
| 4 | Geospatial | **Coordinates only**: lat/lng numbers on Ocorrência; text descriptions on Parcela/Bacia (no geometry; polygons re-entered later for map phase) |
| 5 | Language | Table/field names and prompts in **PT-BR** (domain language), prompt files documented in EN/PT mix — prompts pasted verbatim |
| 6 | Prompt granularity | **One table per prompt file** (simpler to verify, more reliable in Kuma) |
| 7 | SudoLang | **Not used** for this task — structured markdown is clearer for Kuma; SudoLang reserved for future domain-logic/codegen specs |

## Proposed Changes

### New files (all under `docs/baserow/kuma-prompts/`)

| File | Purpose |
|---|---|
| `00-visao-geral.md` | How to use the prompts; ordering (dependency-first); Kuma access path; verification workflow |
| `01-contato.md` | Prompt for **Contato** table |
| `02-comunicacao.md` | Prompt for **Comunicação** table (links to Contato) |
| `03-reuniao.md` | Prompt for **Reunião** table (links to Comunicação + Contato) |
| `04-proprietario.md` | Prompt for **Proprietário** table (links to Contato) |
| `05-parcela.md` | Prompt for **Parcela** table (links to Proprietário) |
| `06-bacia-hidrografica.md` | Prompt for **Bacia Hidrográfica** table (links to Parcela) |
| `07-ocorrencia.md` | Prompt for **Ocorrência** table (links to Parcela + Contato) |

### Field specs (decision-complete, used to generate each prompt)

**1. Contato** (no dependencies)
- Nome — Text (primary)
- Tipo — Single select: Pessoa, Órgão Público, Condomínio, Empresa, Outro
- Organização — Text
- E-mail — E-mail field
- Telefone — Phone number
- Endereço — Long text
- Observações — Long text

**2. Comunicação** (links to Contato)
- Título — Text (primary)
- Tipo — Single select: Ofício, E-mail, Mensagem, Ligação, Visita, Outro
- Direção — Single select: Enviada, Recebida
- Data — Date
- Contato — Link to **Contato** (the counterpart)
- Conteúdo — Long text
- Status — Single select: Pendente, Respondida, Arquivada

**3. Reunião** (links to Comunicação + Contato)
- Título — Text (primary)
- Comunicação — Link to **Comunicação** (parent row, one-to-one)
- Data e hora — Date (with time)
- Local — Text
- Participantes — Link to **Contato** (multiple)
- Pauta — Long text
- Ata — Long text
- Conclusões — Long text
- Decisões — Long text
- Status — Single select: Agendada, Realizada, Cancelada

**4. Proprietário** (links to Contato)
- Nome — Text (primary)
- Contato — Link to **Contato**
- Observações — Long text

**5. Parcela** (links to Proprietário)
- Código — Text (primary, e.g. P-001)
- Proprietário — Link to **Proprietário**
- Localização — Long text (description; no geometry per decision)
- Área (m²) — Number

**6. Bacia Hidrográfica** (links to Parcela)
- Nome — Text (primary, "Igarapé-Água Branca")
- Descrição — Long text
- Limites — Long text (textual description; no geometry per decision)
- Parcelas — Link to **Parcela** (multiple)

**7. Ocorrência** (links to Parcela + Contato)
- Título — Text (primary)
- Descrição — Long text
- Data — Date
- Tipo — Single select: Poluição, Esgoto, Desmatamento, Queimada, Enchente, Outro
- Latitude — Number
- Longitude — Number
- Status — Single select: Aberta, Em andamento, Resolvida
- Parcela — Link to **Parcela**
- Contato — Link to **Contato** (reporter)

### Prompt file format (each `0X-*.md`)

1. **Objetivo** — one line: what table and why (from the ideas).
2. **Prompt para o Kuma** — a fenced PT-BR block, copy-paste verbatim. Tells Kuma the exact table name, field names, types, select options, and links (referencing the already-created tables).
3. **Spec de verificação** — compact field table (name/type/options) for the executor's MCP check.
4. **Notas** — links to prior tables it depends on; expected result; corrective prompt if Kuma misses a field.

## Assumptions

- Kuma AI can reliably create tables with link-row fields in 2.3.3 (native assistant, already working per handoff).
- The existing **Projects** table is a scratch/test table — **left untouched** (no rename/delete unless the user asks).
- Field names PT-BR, prompts PT-BR; documentation prose in PT-BR with EN where natural.
- If Kuma cannot create a link field in the same prompt, fallback: create table first, then add link fields via a second short prompt (documented in `00-visao-geral.md`).

## Verification

1. After user pastes each prompt and confirms in the UI, executor runs MCP:
   - `list_tables` (database 1) — table exists with expected id.
   - `get_table_schema` — every expected field present with correct type/options; links resolved.
2. If a field is missing/wrong, generate a corrective follow-up prompt for Kuma (file's "Notas" section) and re-verify.
3. Final: all 7 tables present; `list_table_rows` on each returns empty (no seed data in this iteration — data comes later).
