# Baserow Builder: app "Gestão de Contatos" handsfree (emulação Kuma) + skill local

## 1. Resumo

Construir, handsfree, o app Builder **"Gestão de Contatos"** (workspace 2, Baserow 2.3.3 self-hosted em `localhost:8484`) emulando exatamente o que o **Kuma AI assistant** faz por dentro, usando o **código-fonte real** (clone da tag `2.3.3` em `/tmp/baserow-src/`) como referência — sem inferência via REST/SQL.

Dois entregáveis:

1. **Skill local** `.trae/skills/baserow-builder/SKILL.md` — documento detalhado e consultável localmente com o mecanismo completo (services Django, fórmulas, ordem de execução, dispatch por tipo de elemento) para construir/estender apps Builder handsfree daqui em diante.
2. **Script executável** `_baserow/scripts/baserow/build_contact_app.py` — roda dentro do container `backend` via `manage.py shell`, constrói o app inteiro e imprime um manifesto com todos os IDs criados.

Escopo do app (aprovado): 3 páginas (`/contatos`, `/contato/:id`, `/novo-contato`) + header/menu compartilhado, tema **forest**.

## 2. Estado atual (verificado)

- Workspace 2 com app **id=1 MataViva** (database, 7 tabelas) e app **id=2 Gestão de Contatos** (builder).
- Builder id=2: página `__shared__` (id=1) e página "Contatos" `/contatos` (id=2) com 5 elementos órfãos (ids 1,2,3,4,5: heading/repeat/table) e 1 data source (id=1) — **lixo de tentativas anteriores de inferência; será removido**.
- Integration `local_baserow` já existe (integration id=1, core_service id=1).
- Tabelas (database 1): Contato=2, Telefone=3, E-mail=4, Endereço=5, BaciaHidrográfica=6, Coordenada=7, Terreno=8 — schema 100% conforme specs em `docs/baserow/kuma-prompts/`.
- Campos (por spec): Contato: Nome (primary), Tipo (single_select), CPF, CNPJ, Vínculos (link self), Observações, + reverse links Telefones/E-mails/Endereços. Telefone: Número, Contato (link), Capacidades (multiple_select). E-mail: E-mail, Contato (link), Tipo. Endereço: Endereço, Contato (link), Tipo. Terreno: Código, Proprietário (link Contato), Bacia (link), Localização, Área (m²).

## 3. Mecanismo descoberto no source (o que o Kuma faz de verdade)

Verificado nos arquivos de `/tmp/baserow-src` (tag 2.3.3). **O Kuma não usa REST nem SQL**: suas tools chamam os **services Django em processo** dentro do container. Para emular: rodar um script Python via `docker compose -f _baserow/docker-compose.dev.yml exec -T backend python manage.py shell < script.py`.

### 3.1 Entry points (imports e assinaturas exatas)

```python
from baserow.core.actions import CreateApplicationActionType       # cria app (Kuma create_builders)
from baserow.core.service import CoreService
from baserow.contrib.builder.pages.service import PageService
from baserow.contrib.builder.data_sources.service import DataSourceService
from baserow.contrib.builder.elements.actions import CreateElementActionType
from baserow.contrib.builder.elements.registries import element_type_registry
from baserow.contrib.builder.workflow_actions.service import BuilderWorkflowActionService
from baserow.contrib.builder.workflow_actions.registries import builder_workflow_action_type_registry
from baserow.core.services.registries import service_type_registry
from baserow.core.formula.types import BASEROW_FORMULA_MODE_ADVANCED, BaserowFormulaObject
```

- **App**: `CreateApplicationActionType.do(user, workspace, "builder", name=...)` — o post-hook já cria a integration `local_baserow` e aplica tema via `apply_theme(app, theme, user=user)`. (No nosso caso o app já existe — mantemos id=2 e só aplicamos o tema.)
- **Page**: `PageService().create_page(user, builder, name=..., path=..., path_params=[{"name": "id", "type": "numeric"}], query_params=[])`. Delete: `PageService().delete_page(user, page)`.
- **Data source**:
  - list_rows: `DataSourceService().create_data_source(user, page, name=..., service_type=service_type_registry.get("local_baserow_list_rows"), integration=<int>, table=<Table>, filters=[...])`.
  - get_row: `... service_type_registry.get("local_baserow_get_row"), row_id=BaserowFormulaObject.create("get('page_parameter.id')", mode=BASEROW_FORMULA_MODE_ADVANCED)`.
  - **Filtro dinâmico** (verificado em `service_type_mixins.py` + `models.py`): `LocalBaserowTableServiceFilter` com `value` = `FormulaField` + flag `value_is_formula`; resolve `get('page_parameter.id')` no dispatch. Criar via kwargs `filters=[{"field_id": X, "type": "link_row_has", "value": <BaserowFormulaObject>, "value_is_formula": True}]` (o serializer do mixin trata); fallback: criar o ds e depois `LocalBaserowTableServiceFilter.objects.create(service=..., field_id=..., type="link_row_has", value=..., value_is_formula=True, order=0)`.
- **Elemento**: `CreateElementActionType.do(user, element_type_registry.get(<type>), page, {**orm_kwargs, "reference_element_id": <pai|None|antes>, "position": "child"|"south"|"north"})`. Regras: filho de container → `reference_element_id=parent_id`, `position="child"`; append no fim → `reference_element_id=None`, `position="south"`; coluna → filhos com `place_in_container="0"`. **Pai antes do filho.**
- **Workflow action**: `BuilderWorkflowActionService().create_workflow_action(user, builder_workflow_action_type_registry.get(<tipo>), page=page, element_id=..., event=..., **kwargs)`.
  - notification: `title=BaserowFormulaObject.create("'...'", mode=ADVANCED)`, `description=...`.
  - open_page: `navigation_type="page"`, `navigate_to_page_id=<id>`, `page_parameters=[{"name": "id", "value": BaserowFormulaObject.create(..., mode=ADVANCED)}]`, `target="self"`.
  - create_row: `service={"table": <Table>, "integration": <int>, "field_mappings": [{"field_id": int, "value": BaserowFormulaObject.create(..., mode=ADVANCED), "enabled": True}]}`.
  - **Botão de coluna de tabela**: event real é `"{collection_field_uid}_click"` (uid do `CollectionField` do botão). `create_table_button_actions` na 2.3.3 é placeholder — a action é criada à parte com esse event.

### 3.2 Fórmulas (todas via `BaserowFormulaObject.create(..., mode=BASEROW_FORMULA_MODE_ADVANCED)`)

- String estática: `wrap_static_string("texto")` → `'texto'` (fórmula com aspas simples).
- Registro atual (repeat/table): `get('current_record.field_<field_id>')` + sufixos por tipo: single_select → `.value`; multiple_select/link_row → `.*.value`; created_by/last_modified_by → `.name`.
- Form input: `get('form_data.<element_id>')` (element_id = id do elemento input/choice/selector).
- Parâmetro de rota: `get('page_parameter.<name>')`.
- ID da linha atual (click de botão em tabela): função `row_id()` (retorna `model_instance.id` no contexto de collection).

### 3.3 ORM kwargs por tipo de elemento (usados no script)

- heading: `value` (fórmula), `level`.
- text: `value`, `format="plain"`.
- link: `value`, `variant` ("link"/"button"), `navigation_type="page"`, `navigate_to_page_id`, `page_parameters`, `target="self"`.
- table: `data_source_id`, `items_per_page=20`, `button_load_more_label`, `fields=[{"name": ..., "type": "text"|"button", "config": {"value"|"label": <fórmula>}}]`.
- repeat: `data_source_id`, `orientation="vertical"`, `items_per_page=20`, `items_per_row={"desktop": 1, "tablet": 1, "smartphone": 1}`.
- form_container: `submit_button_label`, `reset_initial_values_post_submission=False`.
- input_text: `label`, `placeholder`, `default_value`, `required`, `validation_type="any"`, `is_multiline`, `rows`.
- choice: `label`, `placeholder`, `default_value`, `required`, `multiple=False`, `show_as_dropdown=True`; options criadas em post-create (`options=[{"name": ..., "value": ...}]`) — valores devem bater com os options do campo single_select da tabela.
- record_selector: `label`, `data_source_id`, `required`, `multiple`, `placeholder`.
- header/footer: `share_type="all"` (criados na shared page); menu: `orientation`, `alignment`, `menu_items=[{"name": ..., "page_id": ...}]`.

### 3.4 Ordem de execução (obrigatória)

1. App (+ tema). 2. Pages (todas, para resolver ids em links). 3. Data sources por página. 4. Elementos por página (pai → filho, topo → base). 5. Actions por página. 6. Verificação/readback.

## 4. Decisões do grilling

| # | Decisão | Escolha |
|---|---------|---------|
| 1 | Tema | **forest** (aplicado via `apply_theme(app, "forest", user)`) |
| 2 | Header/menu | **Sim** — header `share_type="all"` na shared page + menu filho com itens "Contatos" e "Novo Contato" |
| 3 | Página de detalhe | **Completo** — get_row do contato + seções de vínculos diretos (Telefones, E-mails, Endereços, Vínculos, Terrenos) |
| 4 | Listagem | **Nome + Telefone + E-mail + botão "Ver"** (coluna botão → open_page `/contato/:id`) |
| 5 | Formulário | **Incluir record selectors** (Telefones, E-mails, Endereços, Vínculos) |
| 6 | Pós-submit | **Notification "Contato criado com sucesso" + open_page → /contatos** |

Nota (ajuste de design): "todos os vínculos" = todos os **links diretos** do Contato (Telefones, E-mails, Endereços, Vínculos, Terrenos via reverse `Proprietário`). BaciaHidrográfica e Coordenada não têm link direto com Contato (só via Terreno) — ficam fora das seções; acessíveis pela tabela Terreno.

## 5. Entregáveis e arquivos

| Arquivo | Ação |
|---|---|
| `.trae/skills/baserow-builder/SKILL.md` | **Criar** — skill detalhada (seção 8) |
| `_baserow/scripts/baserow/build_contact_app.py` | **Criar** — script executável (seção 7) |
| `.trae/documents/baserow-kuma-schema-prompts.md` | Não alterar (desatualizado; nova referência é a skill) |

Execução do script (fora do Plan Mode):
```
docker compose -f _baserow/docker-compose.dev.yml exec -T backend python manage.py shell < _baserow/scripts/baserow/build_contact_app.py
```
Se `manage.py` não estiver no PATH do container: localizar em `/baserow/backend/manage.py` (verificar com `docker compose -f _baserow/docker-compose.dev.yml exec -T backend ls /baserow/backend/manage.py`) e usar `python /baserow/backend/manage.py shell`.

## 6. Design detalhado

### 6.1 Shared page (header/menu)

| Elemento | Tipo | Kwargs | Pai |
|---|---|---|---|
| header | header | `share_type="all"` | — (shared page) |
| menu | menu | `menu_items=[{"name": "Contatos", "page_id": <p/contatos>}, {"name": "Novo Contato", "page_id": <p/novo-contato>}]` | header |

### 6.2 Página `/contatos` (Contatos)

Data source: `ds_contatos` = list_rows na tabela **Contato** (integration existente). Sem filtros; sem sort inicial.

| # | Elemento | Kwargs |
|---|---|---|
| 1 | heading | `value='Contatos'`, `level=1` |
| 2 | link | `value='Novo Contato'`, `variant='button'`, `navigation_type='page'`, `navigate_to_page_id=<p/novo-contato>` |
| 3 | table | `data_source_id=<ds_contatos>`, fields: |
| | | `{name: "Nome", type: "text", config.value: get('current_record.field_<nome_id>')}` |
| | | `{name: <nome real reverse Telefone>, type: "text", config.value: get('current_record.field_<rev_tel_id>.*.value')}` |
| | | `{name: <nome real reverse E-mail>, type: "text", config.value: get('current_record.field_<rev_email_id>.*.value')}` |
| | | `{name: "", type: "button", config.label: 'Ver'}` |

Action: `open_page` no elemento table, event `"{uid}_click"` (uid do CollectionField do botão), `navigate_to_page_id=<p/contato-detalhe>`, `page_parameters=[{"name": "id", "value": "row_id()"}]`.

### 6.3 Página `/contato/:id` (Contato Detalhe)

`path_params=[{"name": "id", "type": "numeric"}]`.

Data sources:

| Ref | Tipo | Config |
|---|---|---|
| ds_contato | get_row | table Contato, `row_id=get('page_parameter.id')` |
| ds_telefones | list_rows | table Telefone, filter `[Contato link, link_row_has, get('page_parameter.id')]` |
| ds_emails | list_rows | table E-mail, filter `[Contato link, link_row_has, get('page_parameter.id')]` |
| ds_enderecos | list_rows | table Endereço, filter `[Contato link, link_row_has, get('page_parameter.id')]` |
| ds_vinculos | list_rows | table Contato, filter `[Vínculos link, link_row_has, get('page_parameter.id')]` |
| ds_terrenos | list_rows | table Terreno, filter `[Proprietário link, link_row_has, get('page_parameter.id')]` |

Elementos (ordem, pai → filho):

| # | Elemento | Kwargs |
|---|---|---|
| 1 | link | `value='← Voltar'`, `variant='link'`, page → /contatos |
| 2 | heading | `value=get('current_record.field_<nome_id>')` (ds_contato), `level=1` |
| 3 | text | `value=get('current_record.field_<tipo_id>.value')` |
| 4 | text | `value=get('current_record.field_<cpf_id>')` |
| 5 | text | `value=get('current_record.field_<cnpj_id>')` |
| 6 | text | `value=get('current_record.field_<obs_id>')` |
| 7 | heading | `value='Telefones'`, `level=2` |
| 8 | repeat | `data_source_id=<ds_telefones>`; filho text `get('current_record.field_<numero_id>')` + filho text `get('current_record.field_<caps_id>.*.value')` |
| 9 | heading | `value='E-mails'`, `level=2` |
| 10 | repeat | `data_source_id=<ds_emails>`; filho text `get('current_record.field_<email_id>')` |
| 11 | heading | `value='Endereços'`, `level=2` |
| 12 | repeat | `data_source_id=<ds_enderecos>`; filho text `get('current_record.field_<endereco_id>')` |
| 13 | heading | `value='Vínculos'`, `level=2` |
| 14 | repeat | `data_source_id=<ds_vinculos>`; filho text `get('current_record.field_<nome_id>')` |
| 15 | heading | `value='Terrenos'`, `level=2` |
| 16 | repeat | `data_source_id=<ds_terrenos>`; filho text `get('current_record.field_<codigo_id>')` |

### 6.4 Página `/novo-contato` (Novo Contato)

Data sources (listagem para os selectors): `ds_tel_sel` (Telefone), `ds_email_sel` (E-mail), `ds_end_sel` (Endereço), `ds_cont_sel` (Contato).

form_container (`submit_button_label='Salvar'`) com filhos:

| Filho | Tipo | Kwargs |
|---|---|---|
| Nome | input_text | `label='Nome'`, `required=True` |
| Tipo | choice | `label='Tipo'`, options = options reais do campo single_select Contato.Tipo (lidos do banco) |
| CPF | input_text | `label='CPF'` |
| CNPJ | input_text | `label='CNPJ'` |
| Observações | input_text | `label='Observações'`, `is_multiline=True` |
| Telefones | record_selector | `data_source_id=<ds_tel_sel>`, `multiple=True`, `label='Telefones'` |
| E-mails | record_selector | `data_source_id=<ds_email_sel>`, `multiple=True`, `label='E-mails'` |
| Endereços | record_selector | `data_source_id=<ds_end_sel>`, `multiple=True`, `label='Endereços'` |
| Vínculos | record_selector | `data_source_id=<ds_cont_sel>`, `multiple=True`, `label='Vínculos'` |

Actions (event `submit` no form_container, nesta ordem):
1. **create_row** table Contato, `field_mappings`:
   - Nome → `get('form_data.<input_nome_id>')`
   - Tipo → `get('form_data.<choice_tipo_id>')`
   - CPF → `get('form_data.<input_cpf_id>')`
   - CNPJ → `get('form_data.<input_cnpj_id>')`
   - Observações → `get('form_data.<input_obs_id>')`
   - reverse Telefones → `get('form_data.<selector_tel_id>')`
   - reverse E-mails → `get('form_data.<selector_email_id>')`
   - reverse Endereços → `get('form_data.<selector_end_id>')`
   - Vínculos → `get('form_data.<selector_vin_id>')`
2. **notification**: `title='Contato criado com sucesso'`, `description='Registro adicionado à lista de contatos.'`
3. **open_page** → `/contatos`.

## 7. Implementação — o script (`_baserow/scripts/baserow/build_contact_app.py`)

Self-contained (Django setup automático via `manage.py shell`), idempotente (delete-then-create por nome), imprime manifesto ao final.

Passos:
1. **Setup**: resolver workspace 2, app builder "Gestão de Contatos" (id=2), integration `local_baserow` (get-or-create), usuário (primeiro com acesso ao workspace; preferir superuser).
2. **Tema**: `apply_theme(builder, "forest", user=user)` (fallback: ler JSON do tema de `APPLICATION_TEMPLATES_DIR` + `ThemeService().update_theme`).
3. **Limpeza**: deletar página "Contatos" existente (id=2) via `PageService().delete_page` (cascata remove ds/elements órfãos). Manter shared page.
4. **Lookup de campos** (robusto por nome, não hardcoded):
   - Tabelas por nome no database 1.
   - Por tabela: campos por nome; campo single_select Tipo → ler `select_options`.
   - Links: em Contato, campos `link_row` agrupados por `link_row_table_id` → mapear reverse de Telefone(3), E-mail(4), Endereço(5), Vínculos(self 2); em Telefone/E-mail/Endereço, o campo link → Contato(2); em Terreno, "Proprietário".
5. **Criar pages** (3) — nome+path conforme seção 6; registrar ids.
6. **Criar header+menu** na shared page (6.1).
7. **Criar data sources + elementos + actions** página a página, na ordem exata das seções 6.2–6.4, seguindo 3.1–3.4.
8. **Manifesto** (stdout): app id, pages (id+path), ds (id+nome+tipo), elementos (id+tipo), actions (id+tipo+event), ids de campos usados.
9. Erros: abrir transação por página; em falha, imprimir traceback e sair com código ≠ 0 sem deixar estado meio-feito (rollback).

Helpers inline no script (para não depender de `baserow_enterprise`): `wrap_static_string(s) = f"'{s}'"` e conversão de colunas de tabela (equivalente a `_convert_table_fields`: text com valor fórmula direto; button com label).

## 8. Skill local — `.trae/skills/baserow-builder/SKILL.md`

Estrutura de conteúdo (detalhada, consultável, ~seção 3 + extras):

1. **Quando usar** — criar/estender apps Builder (pages/elements/data sources/actions) handsfree.
2. **Por que não REST/SQL** — builder é JWT-only e as tools do Kuma chamam services em processo.
3. **Como executar** — receita `docker compose exec -T backend python manage.py shell < script.py` (+ localização do manage.py).
4. **Mecanismo completo** — seção 3 deste plano (entry points, fórmulas, dispatch por tipo, ordem de execução, filtros com fórmula, eventos `{uid}_click`, `row_id()`).
5. **Catálogo** — 19 tipos de elemento com kwargs ORM; 7 tipos de action; 4 service types `local_baserow_*`; 23 temas.
6. **Padrões do Kuma** — dedup por nome/estrutura, header/footer só navegação absoluta, repeat para listas, table para grids, form → create_row com `form_data`, detalhe → get_row + `page_parameter`.
7. **Verificação** — readback via `manage.py shell`, checagem no app-builder.
8. **Referência de fórmulas** — paths `current_record`/`form_data`/`page_parameter` + sufixos por tipo de campo.

## 9. Verificação

1. Script termina com exit 0 e manifesto completo impresso.
2. Readback via `manage.py shell`: 3 páginas + shared; ds/elements/actions por página conferem com o design.
3. Browser em `http://localhost:8484/app-builder` → app Gestão de Contatos:
   - Header + menu visíveis nas 3 páginas; tema forest aplicado.
   - `/contatos`: heading, botão "Novo Contato", tabela com colunas Nome/Telefone/E-mail/"Ver".
   - Clicar "Ver" → abre `/contato/:id` com dados + seções (Telefones/E-mails/Endereços/Vínculos/Terrenos).
   - `/novo-contato`: submeter com dados reais → notification + redirect; conferir a linha criada na tabela Contato (via REST token ou banco) com os links corretos.

## 10. Assunções e riscos

- **`baserow_enterprise` importável no container**: o instance tem o AI assistant ativo (MCP respondeu com 7 tools) → pacote enterprise instalado. Mitigação: script usa apenas imports community + helpers inline; só `apply_theme` usa enterprise (fallback manual documentado).
- **`row_id()` em page_parameter de botão de tabela**: verificado no source (`BaserowRowId` com `model_instance` em contexto). Se o contexto de click não expuser o modelo (caso improvável), fallback: passar `get('current_record.field_<primary_id>')` — ajuste documentado na skill.
- **record_selector → link_row no create_row**: padrão do Kuma; valor do form_data = id(s) da(s) linha(s) selecionada(s). Verificado no browser (passo 9.3).
- **`variant='button'` no LinkElement**: validar choices na execução; fallback `variant='link'`.
- **Valores de choice vs options do single_select**: lidos do banco na execução — sempre coerentes.
- **MCP do Trae segue com problema de conexão** (não afeta este plano; verificação é via container + browser).
- **Nomes/paths de página** são únicos por app (garantido pelo `PageService`).
