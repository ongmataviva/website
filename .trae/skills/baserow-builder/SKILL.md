---
name: baserow-builder
description: >
  Build, read and manage Baserow App Builder applications handsfree (no UI, no
  JWT session), by emulating the Kuma AI assistant's in-process builder tools
  through `manage.py shell` inside the backend container. Use when asked to
  create/update/delete builder pages, elements, data sources, workflow actions,
  themes, or to replicate "just like KumaAI would" for Baserow self-hosted
  2.3.x (this workspace: Docker + Caddy, localhost:8484).
---

# Baserow App Builder — handsfree construction (Kuma-style)

## When to use

- Creating/editing a Builder application (pages, elements, data sources,
  workflow actions, theme) on Baserow 2.3.x self-hosted.
- Any request like "create this app for me handsfree, like KumaAI would".
- Reading back a Builder app's structure for verification.
- **Not** for plain database rows — those go through the REST API / token
  (`BASEROW_DATABASE_TOKEN` in `.env`, rows endpoints only).

## Why not REST or SQL

- The Builder (app-builder) is **JWT-session-only** via HTTP. A database token
  can only touch rows; fields/apps/pages return 401/403.
- Kuma's 19 builder tools call **Django services in-process** (no HTTP, no SQL):
  `PageService`, `DataSourceService`, `CreateElementActionType`,
  `BuilderWorkflowActionService`, `ThemeService`. To be "handsfree like Kuma"
  we call the exact same services from a Python script piped into
  `manage.py shell` inside the backend container.

## How to run

Container paths (Baserow 2.3.3 image): manage.py lives at
`/baserow/backend/src/baserow/manage.py` (NOT `/baserow/backend/manage.py`);
the workdir is `/baserow/backend`. Python is `python` (no venv path needed).

```bash
docker compose -f _baserow/docker-compose.dev.yml exec -T backend \
  python /baserow/backend/src/baserow/manage.py shell < _baserow/scripts/baserow/build_contact_app.py
```

Rules that bit us before:

- **No `if __name__ == "__main__"` guard** when piping a script in — call
  `main()` directly (Django's shell `exec`s stdin; the guard silently skips and
  the run "succeeds" doing nothing). If you keep the guard, add `else: main()`.
- **Capture output**: `> /tmp/build_out.txt` on the host; read it with the Read
  tool. Terminal logs get truncated/interleaved.
- The user forbids appending `2>&1` to terminal commands.
- Scripts should be **idempotent**: purge the builder's non-shared pages
  (including **trashed** ones — see cleanup) at the start.

## Core mechanism (source-verified, 2.3.3)

### Entity creation order (mandatory)

1. Theme (applies defaults; do first so elements inherit).
2. Pages (shared page → header/footer live there).
3. Data sources (per page).
4. Elements (parents before children; the page graph requires
   `reference_element_id` + `position`).
5. Workflow actions (must reference existing element ids).

### Entry points

```python
# Pages
PageService().create_page(user, builder, name="X", path="/x",
    path_params=[{"name": "id", "type": "numeric"}])  # optional path params
PageHandler().get_shared_page(builder)                # the shared "__shared__" page

# Data sources
DataSourceService().create_data_source(user, page,
    name="...", service_type=service_type_registry.get("local_baserow_list_rows" | "local_baserow_get_row"),
    table=Table, integration=Integration,            # list_rows
    row_id=F("get('page_parameter.id')"),            # get_row only
)

# Dynamic link filter (resolved at dispatch time, NOT static):
LocalBaserowTableServiceFilter.objects.create(
    service=ds.service.specific, field_id=link_field.id,
    type="link_row_has", value=F("get('page_parameter.id')"),
    value_is_formula=True, order=0)

# Elements — always through the action type (handles graph + post-create):
CreateElementActionType.do(user, element_type_registry.get(<type>), page, {
    "reference_element_id": ref_id | None, "position": "child" | "north" | "south",
    ...element kwargs})
#   parent given → position="child", ref=parent.id
#   append       → position="south", ref=None

# Workflow actions
BuilderWorkflowActionService().create_workflow_action(user,
    builder_workflow_action_type_registry.get(<type>),
    page=page, element_id=..., event="submit" | "click" | "{uid}_click", **kwargs)
```

### Formulas (always advanced mode, like Kuma)

```python
BaserowFormulaObject.create(<formula>, mode=BASEROW_FORMULA_MODE_ADVANCED)
```

- Static string → wrap in quotes: `"'texto'"`.
- Current row (repeat/table context): `get('current_record.field_<id>')`.
  Suffix by field type (Kuma `_FORMULA_PATH_SUFFIX`):
  - single_select → `.value`
  - multiple_select / link_row → `.*.value`
  - created_by / last_modified_by → `.name`
- Form input value: `get('form_data.<element_id>')`.
- URL path param: `get('page_parameter.<name>')` (e.g. `get('page_parameter.id')`).
- Row clicked in a table button column: `row_id()` (works inside the
  `{collection_field_uid}_click` event context).
- `get()` requires the field to exist in the data source's record schema;
  keep filters/columns on the same table the data source reads.

### Element catalog (19 types)

heading (`value`, `level`), text (`value`, `format`), button (`value`),
link (`value`, `variant` "link"|"button", `navigation_type` "page"|"custom",
`navigate_to_page_id`, `page_parameters`, `target` "self"|"new", `navigate_to_url`),
image (`image_url`, `alt_text`), column (`column_amount`, `column_gap`, `alignment`),
form_container (`submit_button_label`, `reset_initial_values_post_submission`),
simple_container, input_text (`label`, `placeholder`, `required`, `validation_type`,
`is_multiline`, `rows`), choice (`label`, `multiple`, `show_as_dropdown`,
**`choice_options=[{"name","value"}, ...]`** — post-create hook builds
ChoiceElementOption rows), checkbox, datetime_picker, record_selector
(`label`, **`data_source_id`**, `multiple`, `required`), table (`data_source_id`,
`items_per_page`, **`fields=[...]`**), repeat (`data_source_id`, `orientation`,
`items_per_page`, `items_per_row`), header (`share_type` "all"),
footer (`share_type`), menu (`orientation`, `alignment`,
**`menu_items=[{"uid","type":"link","variant":"link","name",
"navigation_type":"page","navigate_to_page_id","target":"self"}, ...]`** — post-create
hook builds child MenuItemElements), auth_form.

### Table element `fields` (column config)

```python
fields=[
  {"name": "Nome",      "type": "text",   "config": {"value": F("get('current_record.field_2')")}},
  {"name": "Telefones", "type": "text",   "config": {"value": F("get('current_record.field_11.*.value')")}},
  {"name": "",          "type": "button", "config": {"label": F("'Ver'")}},   # action column
]
```

To wire a button column: find the CollectionField row and bind the event.

```python
btn_field = table.specific.fields.filter(type="button").first()   # M2M, not element_id!
create_workflow_action(..., type="open_page", element_id=table.id,
    event=f"{btn_field.uid}_click",
    navigate_to_page_id=detail_page.id,
    page_parameters=[{"name": "id", "value": F("row_id()")}], target="self")
```

### Workflow action types (registry keys)

- `create_row` — service dict: `{"table": Table, "integration": Integration,
  "field_mappings": [{"field_id": int, "value": F("get('form_data.<el_id>')"),
  "enabled": True}, ...]}`. `prepare_values` creates the service if absent.
- `update_row`, `delete_row`, `notification` (`title`, `description` formulas),
- `open_page` (`navigate_to_page_id`, `page_parameters`, `target`),
- `refresh_data_source` (`data_source_id`), `logout`.

Events: `"submit"` on form_container; `"click"` on button/link elements;
`"{collection_field_uid}_click"` on table button columns.

### Theme

```python
from baserow_enterprise.assistant.tools.builder.themes import apply_theme
apply_theme(builder, "forest", user=user)   # any of the 23 ab_*_theme.json templates
```

Fallback (enterprise missing): read `ab_forest_theme.json` from
`settings.APPLICATION_TEMPLATES_DIR` and
`ThemeService().update_theme(user, builder, **theme_data)`.

## Kuma's flow (what we emulate)

`create_pages` → `create_data_sources` → `create_elements` (parents→children,
append via south) → `create_actions` → `theme`. Shared header/footer live on the
shared page; the menu is a child of the header with `menu_items`. Tables render
from a list_rows data source; button columns + `{uid}_click` action carry the
`row_id()` into the detail page path param; the detail page uses a `get_row`
data source for the record plus list_rows data sources with
`LocalBaserowTableServiceFilter` (value_is_formula=True) for related records;
the form page collects `form_data` into a `create_row` service's field_mappings,
then notification + open_page on submit.

## Idempotent cleanup (important)

`Page.objects` hides trashed rows, but the DB unique constraint on
`(builder_id, path)` still applies to trashed pages — recreate fails with
`PagePathNotUnique`. Purge **all** non-shared pages including trashed:

```python
from baserow.contrib.builder.pages.models import Page
stale = Page.objects_and_trash.filter(builder=builder, shared=False)
for p in stale:
    p.delete()          # hard delete; cascades elements/data_sources/actions
```

## Known pitfalls (learned the hard way)

- `Field.objects.filter(table=...)` returns **base** Field instances —
  `link_row_table_id` is `None` on them. Use
  `LinkRowField.objects.filter(table=...)` for link targets (or `.specific`).
- `CollectionField` has **no** `element_id`; it's reached via
  `table.specific.fields` (M2M). Filter `type="button"`.
- `Page.objects_and_trash` (mixin manager), not `all_objects`.
- Tables are `Contato/Telefone/E-mail/Endereço/BaciaHidrografica/Coordenada/
  Terreno` under Database workspace 2; app builder "Gestão de Contatos" (id=2),
  LocalBaserowIntegration id=1.
- Reference implementation: `_baserow/scripts/baserow/build_contact_app.py`
  (this workspace) — self-contained, prints a full manifest, ends with
  `BUILD_OK`.
- Deep source reference: `/tmp/baserow-src` (git clone of tag 2.3.3). Key files:
  `enterprise/backend/src/baserow_enterprise/assistant/tools/builder/`
  (`tools.py`, `helpers.py`, `types/element.py`, `types/data_source.py`,
  `types/workflow_action.py`, `themes.py`, `agents.py`),
  `backend/src/baserow/contrib/builder/{pages,data_sources,elements,
  workflow_actions}/` (services, actions, element_types, models),
  `backend/src/baserow/contrib/integrations/local_baserow/service_types.py`,
  `backend/src/baserow/core/formula/ast/function_defs.py` (`row_id()`).

## Verification checklist

1. Script exit 0 + manifest printed + `BUILD_OK`.
2. Readback via `manage.py shell -c` (pages/elements/data sources/actions counts
   per page; theme values).
3. Browser `http://localhost:8484/app-builder` → open the app: header+menu,
   theme colors, `/contatos` table with button column, click "Ver" → `/contato/:id`
   renders record + related sections, `/novo-contato` submit → notification +
   redirect to `/contatos` + row created.
