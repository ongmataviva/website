"""
Build the "Gestão de Contatos" Builder app handsfree — emulating the Kuma AI
assistant's builder tools (Baserow 2.3.3, source-verified).

Run inside the backend container:
    docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell < scripts/baserow/build_contact_app.py

Idempotent: deletes and recreates the non-shared pages every run.
"""

import json
import os
import sys
import uuid

from django.conf import settings

# ---------------------------------------------------------------------------
# Baserow core
# ---------------------------------------------------------------------------
from baserow.core.formula.types import (
    BASEROW_FORMULA_MODE_ADVANCED,
    BaserowFormulaObject,
)
from baserow.core.models import User, Workspace, WorkspaceUser
from baserow.core.services.registries import service_type_registry

# Database
from baserow.contrib.database.models import Database, Table
from baserow.contrib.database.fields.models import Field, LinkRowField

# Builder
from baserow.contrib.builder.models import Builder
from baserow.contrib.builder.pages.models import Page
from baserow.contrib.builder.pages.handler import PageHandler
from baserow.contrib.builder.pages.service import PageService
from baserow.contrib.builder.data_sources.service import DataSourceService
from baserow.contrib.builder.elements.actions import CreateElementActionType
from baserow.contrib.builder.elements.registries import element_type_registry
from baserow.contrib.builder.workflow_actions.service import BuilderWorkflowActionService
from baserow.contrib.builder.workflow_actions.registries import (
    builder_workflow_action_type_registry,
)
from baserow.contrib.integrations.local_baserow.models import (
    LocalBaserowIntegration,
    LocalBaserowTableServiceFilter,
)

WORKSPACE_ID = 2
BUILDER_NAME = "Gestão de Contatos"


# ---------------------------------------------------------------------------
# Formula helpers (all advanced-mode formula objects, like Kuma)
# ---------------------------------------------------------------------------


def F(formula: str) -> BaserowFormulaObject:
    return BaserowFormulaObject.create(formula, mode=BASEROW_FORMULA_MODE_ADVANCED)


def static(text: str) -> str:
    """Static string wrapped as a Baserow formula literal."""
    return f"'{text}'"


def get_formula(field_id: int, field_type: str = "") -> str:
    """get('current_record.field_<id>') + type suffix (Kuma _field_formula)."""
    if field_type == "single_select":
        suffix = ".value"
    elif field_type in ("multiple_select", "link_row"):
        suffix = ".*.value"
    else:
        suffix = ""
    return f"get('current_record.field_{field_id}{suffix}')"


# ---------------------------------------------------------------------------
# Creation helpers (mirror the Kuma builder tools)
# ---------------------------------------------------------------------------


def create_element(user, page, etype, parent=None, before=None, **kwargs):
    """Create an element in the page graph. Parent → position=child; append → south."""
    if parent is not None:
        ref, position = parent.id, "child"
    elif before is not None:
        ref, position = before.id, "north"
    else:
        ref, position = None, "south"
    data = {"reference_element_id": ref, "position": position}
    data.update({k: v for k, v in kwargs.items() if v is not None})
    return CreateElementActionType.do(user, element_type_registry.get(etype), page, data)


def create_list_rows_ds(user, page, name, table, integration):
    return DataSourceService().create_data_source(
        user,
        page,
        name=name,
        service_type=service_type_registry.get("local_baserow_list_rows"),
        table=table,
        integration=integration,
    )


def create_get_row_ds(user, page, name, table, integration, row_id_formula):
    return DataSourceService().create_data_source(
        user,
        page,
        name=name,
        service_type=service_type_registry.get("local_baserow_get_row"),
        table=table,
        integration=integration,
        row_id=F(row_id_formula),
    )


def add_link_filter(ds, field_id, value_formula):
    """Dynamic link filter — resolved at dispatch time via page_parameter."""
    return LocalBaserowTableServiceFilter.objects.create(
        service=ds.service.specific,
        field_id=field_id,
        type="link_row_has",
        value=F(value_formula),
        value_is_formula=True,
        order=0,
    )


def create_action(user, page, action_type, element_id, event, **kwargs):
    return BuilderWorkflowActionService().create_workflow_action(
        user,
        builder_workflow_action_type_registry.get(action_type),
        page=page,
        element_id=element_id,
        event=event,
        **kwargs,
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    workspace = Workspace.objects.get(id=WORKSPACE_ID)

    ws_user = (
        WorkspaceUser.objects.filter(workspace=workspace)
        .select_related("user")
        .first()
    )
    user = ws_user.user if ws_user else User.objects.filter(is_superuser=True).first()
    if user is None:
        raise SystemExit(f"No usable user found for workspace {WORKSPACE_ID}")

    builder = Builder.objects.get(workspace_id=workspace.id, name=BUILDER_NAME)
    integration = LocalBaserowIntegration.objects.filter(
        application_id=builder.id
    ).first()
    if integration is None:
        raise SystemExit(f"No LocalBaserow integration on builder {builder.id}")
    print(f"builder={builder.id} name={builder.name} integration={integration.id} user={user.id}")

    # --- theme: forest -------------------------------------------------------
    try:
        from baserow_enterprise.assistant.tools.builder.themes import apply_theme as ent_apply_theme

        ent_apply_theme(builder, "forest", user=user)
        print("theme=forest (enterprise apply_theme)")
    except Exception as exc:  # pragma: no cover - fallback path
        theme_path = os.path.join(settings.APPLICATION_TEMPLATES_DIR, "ab_forest_theme.json")
        with open(theme_path) as fh:
            theme_data = json.load(fh)
        from baserow.contrib.builder.theme.service import ThemeService

        ThemeService().update_theme(user, builder, **theme_data)
        print(f"theme=forest (manual fallback: {exc})")

    # --- tables & fields (looked up by name — no hardcoded ids) ---------------
    database = Database.objects.get(workspace_id=workspace.id)
    tables = {t.name: t for t in Table.objects.filter(database_id=database.id)}
    for needed in ("Contato", "Telefone", "E-mail", "Endereço", "Terreno"):
        if needed not in tables:
            raise SystemExit(f"Missing table: {needed}")
    contato, telefone, email, endereco, terreno = (
        tables["Contato"],
        tables["Telefone"],
        tables["E-mail"],
        tables["Endereço"],
        tables["Terreno"],
    )

    def fields_of(table):
        return {f.name: f for f in Field.objects.filter(table=table)}

    cf = fields_of(contato)
    tf = fields_of(telefone)
    ef = fields_of(email)
    adf = fields_of(endereco)
    trf = fields_of(terreno)

    def ftype(field):
        return field.get_type().type

    def link_rows_of(table):
        """{target_table_id: [LinkRowField, ...]} — specific model, real link targets."""
        out = {}
        for f in LinkRowField.objects.filter(table=table):
            out.setdefault(f.link_row_table_id, []).append(f)
        return out

    nome_field = next(f for f in cf.values() if f.primary)
    tipo_field = cf.get("Tipo")
    tipo_options = (
        [o.value for o in tipo_field.select_options.all().order_by("order")]
        if tipo_field
        else []
    )
    cpf_field = cf.get("CPF")
    cnpj_field = cf.get("CNPJ")
    obs_field = cf.get("Observações")

    cf_links = link_rows_of(contato)
    rev_tel = (cf_links.get(telefone.id) or [None])[0]
    rev_email = (cf_links.get(email.id) or [None])[0]
    rev_end = (cf_links.get(endereco.id) or [None])[0]
    vinculos = (cf_links.get(contato.id) or [None])[0]

    tf_links = link_rows_of(telefone)
    ef_links = link_rows_of(email)
    adf_links = link_rows_of(endereco)
    trf_links = link_rows_of(terreno)
    tel_contato = (tf_links.get(contato.id) or [None])[0]
    email_contato = (ef_links.get(contato.id) or [None])[0]
    end_contato = (adf_links.get(contato.id) or [None])[0]
    terreno_prop = (trf_links.get(contato.id) or [None])[0]

    numero_field = tf.get("Número") or next((f for f in tf.values() if f.primary), None)
    caps_field = tf.get("Capacidades")
    email_field = ef.get("E-mail") or next((f for f in ef.values() if f.primary), None)
    end_field = adf.get("Endereço") or next((f for f in adf.values() if f.primary), None)
    codigo_field = trf.get("Código") or next((f for f in trf.values() if f.primary), None)

    print(
        "fields: nome=%s tipo=%s cpf=%s cnpj=%s obs=%s | rev_tel=%s rev_email=%s rev_end=%s vinculos=%s"
        % (
            nome_field.id,
            tipo_field.id if tipo_field else None,
            cpf_field.id if cpf_field else None,
            cnpj_field.id if cnpj_field else None,
            obs_field.id if obs_field else None,
            rev_tel.id if rev_tel else None,
            rev_email.id if rev_email else None,
            rev_end.id if rev_end else None,
            vinculos.id if vinculos else None,
        )
    )

    # --- purge stale pages (incl. trashed — unique path constraint is global) ---
    stale = Page.objects_and_trash.filter(builder=builder, shared=False)
    n_stale = stale.count()
    for p in stale:
        p.delete()  # hard delete; cascades elements/data_sources/actions
    print(f"purged {n_stale} stale page(s)")

    # --- pages -----------------------------------------------------------------
    page_contatos = PageService().create_page(user, builder, name="Contatos", path="/contatos")
    page_detail = PageService().create_page(
        user,
        builder,
        name="Contato Detalhe",
        path="/contato/:id",
        path_params=[{"name": "id", "type": "numeric"}],
    )
    page_form = PageService().create_page(user, builder, name="Novo Contato", path="/novo-contato")
    print(f"pages: contatos={page_contatos.id} detail={page_detail.id} form={page_form.id}")

    shared = PageHandler().get_shared_page(builder)

    # --- shared header + menu -----------------------------------------------------
    header = create_element(user, shared, "header", share_type="all")
    menu_items_orm = [
        {
            "uid": str(uuid.uuid4()),
            "type": "link",
            "variant": "link",
            "name": name,
            "navigation_type": "page",
            "navigate_to_page_id": page_id,
            "target": "self",
        }
        for name, page_id in (("Contatos", page_contatos.id), ("Novo Contato", page_form.id))
    ]
    menu = create_element(
        user, shared, "menu", parent=header,
        orientation="horizontal", alignment="left", menu_items=menu_items_orm,
    )
    print(f"shared: header={header.id} menu={menu.id}")

    # =============================================================================
    # /contatos — list
    # =============================================================================
    ds_contatos = create_list_rows_ds(user, page_contatos, "Contatos", contato, integration)
    create_element(user, page_contatos, "heading", value=F(static("Contatos")), level=1)
    create_element(
        user, page_contatos, "link",
        value=F(static("Novo Contato")),
        variant="button",
        navigation_type="page",
        navigate_to_page_id=page_form.id,
        target="self",
    )
    table = create_element(
        user, page_contatos, "table",
        data_source_id=ds_contatos.id,
        items_per_page=20,
        button_load_more_label=F(static("Carregar mais")),
        fields=[
            {"name": nome_field.name, "type": "text", "config": {"value": F(get_formula(nome_field.id, ftype(nome_field)))}},
        ]
        + (
            [{"name": rev_tel.name, "type": "text", "config": {"value": F(get_formula(rev_tel.id, "link_row"))}}]
            if rev_tel
            else []
        )
        + (
            [{"name": rev_email.name, "type": "text", "config": {"value": F(get_formula(rev_email.id, "link_row"))}}]
            if rev_email
            else []
        )
        + [
            {"name": "", "type": "button", "config": {"label": F(static("Ver"))}},
        ],
    )
    # Button column → open_page with the current row id (event = "{uid}_click")
    btn_field = table.specific.fields.filter(type="button").first()
    create_action(
        user, page_contatos, "open_page",
        element_id=table.id, event=f"{btn_field.uid}_click",
        navigate_to_page_id=page_detail.id,
        page_parameters=[{"name": "id", "value": F("row_id()")}],
        target="self",
    )
    print(f"/contatos: ds={ds_contatos.id} table={table.id} btn_uid={btn_field.uid}")

    # =============================================================================
    # /contato/:id — detail (get_row + dynamic link-filtered sections)
    # =============================================================================
    ds_contato = create_get_row_ds(user, page_detail, "Contato", contato, integration, "get('page_parameter.id')")
    ds_telefones = create_list_rows_ds(user, page_detail, "Telefones", telefone, integration)
    add_link_filter(ds_telefones, tel_contato.id, "get('page_parameter.id')")
    ds_emails = create_list_rows_ds(user, page_detail, "E-mails", email, integration)
    add_link_filter(ds_emails, email_contato.id, "get('page_parameter.id')")
    ds_enderecos = create_list_rows_ds(user, page_detail, "Endereços", endereco, integration)
    add_link_filter(ds_enderecos, end_contato.id, "get('page_parameter.id')")
    ds_vinculos = create_list_rows_ds(user, page_detail, "Vínculos", contato, integration)
    add_link_filter(ds_vinculos, vinculos.id, "get('page_parameter.id')")
    ds_terrenos = create_list_rows_ds(user, page_detail, "Terrenos", terreno, integration)
    add_link_filter(ds_terrenos, terreno_prop.id, "get('page_parameter.id')")
    print(f"/contato/:id ds: contato={ds_contato.id} telefones={ds_telefones.id} emails={ds_emails.id} enderecos={ds_enderecos.id} vinculos={ds_vinculos.id} terrenos={ds_terrenos.id}")

    create_element(
        user, page_detail, "link",
        value=F(static("← Voltar")),
        variant="link", navigation_type="page",
        navigate_to_page_id=page_contatos.id, target="self",
    )
    create_element(
        user, page_detail, "heading",
        value=F(get_formula(nome_field.id, ftype(nome_field))), level=1,
    )
    for label, field in (
        ("Tipo", tipo_field),
        ("CPF", cpf_field),
        ("CNPJ", cnpj_field),
        ("Observações", obs_field),
    ):
        if field:
            create_element(user, page_detail, "text", value=F(get_formula(field.id, ftype(field))))

    def detail_section(title, ds, fields):
        create_element(user, page_detail, "heading", value=F(static(title)), level=2)
        rep = create_element(user, page_detail, "repeat", data_source_id=ds.id)
        for f in fields:
            create_element(user, page_detail, "text", parent=rep, value=F(get_formula(f.id, ftype(f))))

    detail_section("Telefones", ds_telefones, [numero_field] + ([caps_field] if caps_field else []))
    detail_section("E-mails", ds_emails, [email_field])
    detail_section("Endereços", ds_enderecos, [end_field])
    detail_section("Vínculos", ds_vinculos, [nome_field])
    detail_section("Terrenos", ds_terrenos, [codigo_field])

    # =============================================================================
    # /novo-contato — form (inputs + record selectors + create_row)
    # =============================================================================
    ds_tel_sel = create_list_rows_ds(user, page_form, "Telefones (seleção)", telefone, integration)
    ds_email_sel = create_list_rows_ds(user, page_form, "E-mails (seleção)", email, integration)
    ds_end_sel = create_list_rows_ds(user, page_form, "Endereços (seleção)", endereco, integration)
    ds_cont_sel = create_list_rows_ds(user, page_form, "Contatos (seleção)", contato, integration)
    print(f"/novo-contato ds: tel={ds_tel_sel.id} email={ds_email_sel.id} end={ds_end_sel.id} cont={ds_cont_sel.id}")

    form = create_element(
        user, page_form, "form_container",
        submit_button_label=F(static("Salvar")),
        reset_initial_values_post_submission=False,
    )

    input_nome = create_element(user, page_form, "input_text", parent=form, label=F(static("Nome")), required=True)
    choice_tipo = None
    if tipo_field and tipo_options:
        choice_tipo = create_element(
            user, page_form, "choice", parent=form,
            label=F(static("Tipo")),
            required=False, multiple=False, show_as_dropdown=True,
            choice_options=[{"name": o, "value": o} for o in tipo_options],
        )
    input_cpf = create_element(user, page_form, "input_text", parent=form, label=F(static("CPF"))) if cpf_field else None
    input_cnpj = create_element(user, page_form, "input_text", parent=form, label=F(static("CNPJ"))) if cnpj_field else None
    input_obs = create_element(user, page_form, "input_text", parent=form, label=F(static("Observações")), is_multiline=True) if obs_field else None
    sel_tel = create_element(user, page_form, "record_selector", parent=form, label=F(static("Telefones")), data_source_id=ds_tel_sel.id, multiple=True) if rev_tel else None
    sel_email = create_element(user, page_form, "record_selector", parent=form, label=F(static("E-mails")), data_source_id=ds_email_sel.id, multiple=True) if rev_email else None
    sel_end = create_element(user, page_form, "record_selector", parent=form, label=F(static("Endereços")), data_source_id=ds_end_sel.id, multiple=True) if rev_end else None
    sel_vin = create_element(user, page_form, "record_selector", parent=form, label=F(static("Vínculos")), data_source_id=ds_cont_sel.id, multiple=True) if vinculos else None
    print(
        "form elements: nome=%s tipo=%s cpf=%s cnpj=%s obs=%s tel=%s email=%s end=%s vin=%s"
        % (
            input_nome.id,
            choice_tipo.id if choice_tipo else None,
            input_cpf.id if input_cpf else None,
            input_cnpj.id if input_cnpj else None,
            input_obs.id if input_obs else None,
            sel_tel.id if sel_tel else None,
            sel_email.id if sel_email else None,
            sel_end.id if sel_end else None,
            sel_vin.id if sel_vin else None,
        )
    )

    field_mappings = []
    for field, el in (
        (nome_field, input_nome),
        (tipo_field, choice_tipo),
        (cpf_field, input_cpf),
        (cnpj_field, input_cnpj),
        (obs_field, input_obs),
        (rev_tel, sel_tel),
        (rev_email, sel_email),
        (rev_end, sel_end),
        (vinculos, sel_vin),
    ):
        if field and el:
            field_mappings.append(
                {
                    "field_id": field.id,
                    "value": F(f"get('form_data.{el.id}')"),
                    "enabled": True,
                }
            )

    create_action(
        user, page_form, "create_row",
        element_id=form.id, event="submit",
        service={"table": contato, "integration": integration, "field_mappings": field_mappings},
    )
    create_action(
        user, page_form, "notification",
        element_id=form.id, event="submit",
        title=F(static("Contato criado com sucesso")),
        description=F(static("Registro adicionado à lista de contatos.")),
    )
    create_action(
        user, page_form, "open_page",
        element_id=form.id, event="submit",
        navigate_to_page_id=page_contatos.id,
        target="self",
    )
    print(f"actions on form {form.id}: create_row with {len(field_mappings)} mappings + notification + open_page")

    print("BUILD_OK")


if __name__ == "__main__":  # pragma: no cover
    main()
else:
    main()
