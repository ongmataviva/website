import { useEffect, useMemo, useState } from 'react';
import { store, useAppSelector, useCollection, useEntry, useEntryDraft } from '@laikacms/decap-cms/core';
import { Button, Card, Forbidden, LoadingScreen } from './ui';
import { entityMeta } from './entities';
import { navigate } from './routing';
import { usePermissions } from './permissions';
import { NoticiaReadOnly } from './noticia-readonly';
import { AiChatPanel } from './ai-chat-panel';
import {
  TextField,
  SlugField,
  TextAreaField,
  DateField,
  DateTimeField,
  SelectField,
  ToggleField,
  TagsField,
  ImageFieldView,
  MarkdownField,
} from './fields';

/* ============================================================
   Telas otimizadas por entidade (M2).

   Cada entidade tem um formulário próprio, com layout e campos
   pensados para o trabalho de um jornal: Notícias com slug
   automático, selects de categoria/autor carregados das
   coleções, imagem com upload real (MediaPicker) e corpo em
   Markdown (MDXEditor).
   ============================================================ */

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* Opções (value=slug, label=nome) de uma coleção de referência. */
function collectionOptions(entriesState, collectionName, labelKey) {
  const page = entriesState?.pages?.[collectionName];
  const ids = page?.ids ?? [];
  return ids
    .map((id) => entriesState.entities[`${collectionName}.${id}`])
    .filter(Boolean)
    .map((e) => ({
      value: e.data?.slug || e.slug,
      label: e.data?.[labelKey] || e.slug,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

/* ------------------------------------------------------------
   Notícias — dashboard editorial
   ------------------------------------------------------------ */

function NoticiaForm({ draft, collection, isNew }) {
  const data = draft.draftEntry.data || {};
  const byName = (name) => collection.fields?.find((f) => f.name === name) || { name, widget: 'string' };
  const change = (name, value) => draft.changeField({ field: { name }, value, entries: [] });
  const { isAdmin, myAutorSlug } = usePermissions();

  // Slug: automático para novas notícias; respeitado em edição.
  const [slugTouched, setSlugTouched] = useState(!isNew);

  // Nova notícia: data de publicação = hoje.
  useEffect(() => {
    if (isNew && !data.data) change('data', new Date().toISOString().slice(0, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  // Selects de categoria/autor carregados das coleções.
  const cat = useEntry({ collectionName: 'categoria' });
  const aut = useEntry({ collectionName: 'autor' });
  useEffect(() => {
    if (cat.collection && !cat.collectionEntriesLoaded) cat.loadAll();
  }, [cat.collection, cat.collectionEntriesLoaded, cat.loadAll]);
  useEffect(() => {
    if (aut.collection && !aut.collectionEntriesLoaded) aut.loadAll();
  }, [aut.collection, aut.collectionEntriesLoaded, aut.loadAll]);
  const entriesState = useAppSelector((s) => s.entries);
  const catOptions = useMemo(
    () => collectionOptions(entriesState, 'categoria', 'nome'),
    [entriesState],
  );
  const autorOptions = useMemo(
    () => collectionOptions(entriesState, 'autor', 'title'),
    [entriesState],
  );

  // M3 — autor auto-detectado: numa notícia nova, pré-preenche o autor
  // vinculado ao usuário logado (assim que as opções estiverem carregadas).
  useEffect(() => {
    if (!isNew || data.autor) return;
    if (myAutorSlug && autorOptions.length > 0) change('autor', myAutorSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, data.autor, myAutorSlug, autorOptions.length]);

  // Não-admin: o autor é assinado pelo seu perfil (detectado) e travado;
  // só admins sobrescrevem o autor, inclusive a posteriori.
  const autorLocked = !isAdmin;

  return (
    <>
      <Card className="pnl-editor-section">
        <h2 className="pnl-editor-section-title">Conteúdo</h2>
        <div className="pnl-editor-fields">
          <TextField
            field={byName('titulo')}
            value={data.titulo}
            onChange={(v) => {
              change('titulo', v);
              if (!slugTouched) change('slug', slugify(v));
            }}
            className="pnl-field--full"
            placeholder="Título da notícia"
          />
          <SlugField
            field={byName('slug')}
            value={data.slug}
            auto={!slugTouched}
            onChange={(v) => {
              setSlugTouched(true);
              change('slug', v);
            }}
            className="pnl-field--full"
          />
          <TextAreaField
            field={byName('resumo')}
            value={data.resumo}
            onChange={(v) => change('resumo', v)}
            className="pnl-field--full"
            rows={4}
          />
          <ImageFieldView
            field={byName('imagem')}
            value={data.imagem}
            onChange={(v) => change('imagem', v)}
            className="pnl-field--full"
          />
          <MarkdownField
            field={byName('body')}
            value={data.body}
            onChange={(v) => change('body', v)}
            className="pnl-field--full"
          />
        </div>
      </Card>

      <Card className="pnl-editor-section pnl-editor-section--side">
        <h2 className="pnl-editor-section-title">Publicação</h2>
        <div className="pnl-editor-fields">
          <DateField field={byName('data')} value={data.data} onChange={(v) => change('data', v)} />
          <DateTimeField
            field={byName('atualizada')}
            value={data.atualizada}
            onChange={(v) => change('atualizada', v)}
          />
          <SelectField
            field={byName('categoria')}
            value={data.categoria}
            onChange={(v) => change('categoria', v)}
            options={catOptions}
            emptyLabel="— sem categoria —"
          />
          <SelectField
            field={byName('autor')}
            value={data.autor}
            onChange={(v) => change('autor', v)}
            options={autorOptions}
            emptyLabel="— sem autor —"
            disabled={autorLocked}
            hint={autorLocked ? 'Assinada pelo seu perfil. Só admins trocam o autor.' : undefined}
          />
          <TagsField field={byName('tags')} value={data.tags} onChange={(v) => change('tags', v)} />
          <ToggleField field={byName('destaque')} value={data.destaque} onChange={(v) => change('destaque', v)} />
        </div>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------
   Categorias
   ------------------------------------------------------------ */

function CategoriaForm({ draft, collection }) {
  const data = draft.draftEntry.data || {};
  const byName = (name) => collection.fields?.find((f) => f.name === name) || { name, widget: 'string' };
  const change = (name, value) => draft.changeField({ field: { name }, value, entries: [] });

  return (
    <Card className="pnl-editor-section">
      <h2 className="pnl-editor-section-title">Categoria</h2>
      <div className="pnl-editor-fields">
        <TextField field={byName('nome')} value={data.nome} onChange={(v) => change('nome', v)} className="pnl-field--full" />
        <SlugField field={byName('slug')} value={data.slug} onChange={(v) => change('slug', v)} className="pnl-field--full" />
        <TextAreaField
          field={byName('descricao')}
          value={data.descricao}
          onChange={(v) => change('descricao', v)}
          className="pnl-field--full"
          rows={4}
        />
        <ImageFieldView field={byName('imagem')} value={data.imagem} onChange={(v) => change('imagem', v)} className="pnl-field--full" />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------
   Autores
   ------------------------------------------------------------ */

function AutorForm({ draft, collection }) {
  const data = draft.draftEntry.data || {};
  const byName = (name) => collection.fields?.find((f) => f.name === name) || { name, widget: 'string' };
  const change = (name, value) => draft.changeField({ field: { name }, value, entries: [] });

  return (
    <Card className="pnl-editor-section">
      <h2 className="pnl-editor-section-title">Autor</h2>
      <div className="pnl-editor-fields">
        <TextField field={byName('title')} value={data.title} onChange={(v) => change('title', v)} className="pnl-field--full" />
        <TextField field={byName('cargo')} value={data.cargo} onChange={(v) => change('cargo', v)} className="pnl-field--full" />
        <TextField field={byName('login')} value={data.login} onChange={(v) => change('login', v)} className="pnl-field--full" />
        <ImageFieldView field={byName('avatar')} value={data.avatar} onChange={(v) => change('avatar', v)} className="pnl-field--full" />
        <TextAreaField
          field={byName('bio')}
          value={data.bio}
          onChange={(v) => change('bio', v)}
          className="pnl-field--full"
          rows={5}
        />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------
   Páginas
   ------------------------------------------------------------ */

function PaginaForm({ draft, collection }) {
  const data = draft.draftEntry.data || {};
  const byName = (name) => collection.fields?.find((f) => f.name === name) || { name, widget: 'string' };
  const change = (name, value) => draft.changeField({ field: { name }, value, entries: [] });

  return (
    <Card className="pnl-editor-section">
      <h2 className="pnl-editor-section-title">Página</h2>
      <div className="pnl-editor-fields">
        <TextField field={byName('titulo')} value={data.titulo} onChange={(v) => change('titulo', v)} className="pnl-field--full" />
        <SlugField field={byName('slug')} value={data.slug} onChange={(v) => change('slug', v)} className="pnl-field--full" />
        <ImageFieldView field={byName('imagem')} value={data.imagem} onChange={(v) => change('imagem', v)} className="pnl-field--full" />
        <MarkdownField field={byName('body')} value={data.body} onChange={(v) => change('body', v)} className="pnl-field--full" />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------
   Fallback genérico (coleções futuras)
   ------------------------------------------------------------ */

function GenericForm({ draft, collection }) {
  const data = draft.draftEntry.data || {};
  const change = (name, value) => draft.changeField({ field: { name }, value, entries: [] });

  return (
    <Card className="pnl-editor-section">
      <h2 className="pnl-editor-section-title">Dados</h2>
      <div className="pnl-editor-fields">
        {(collection.fields || []).map((field) => {
          const value = data[field.name];
          const onChange = (v) => change(field.name, v);
          switch (field.widget) {
            case 'text':
              return <TextAreaField key={field.name} field={field} value={value} onChange={onChange} className="pnl-field--full" />;
            case 'boolean':
              return <ToggleField key={field.name} field={field} value={value} onChange={onChange} />;
            case 'list':
              return <TagsField key={field.name} field={field} value={value} onChange={onChange} />;
            case 'date':
              return <DateField key={field.name} field={field} value={value} onChange={onChange} />;
            case 'datetime':
              return <DateTimeField key={field.name} field={field} value={value} onChange={onChange} />;
            case 'image':
              return <ImageFieldView key={field.name} field={field} value={value} onChange={onChange} className="pnl-field--full" />;
            case 'markdown':
              return <MarkdownField key={field.name} field={field} value={value} onChange={onChange} className="pnl-field--full" />;
            default:
              return <TextField key={field.name} field={field} value={value} onChange={onChange} />;
          }
        })}
      </div>
    </Card>
  );
}

const FORMS = {
  noticia: NoticiaForm,
  categoria: CategoriaForm,
  autor: AutorForm,
  pagina: PaginaForm,
};

/* ------------------------------------------------------------
   Scaffold do editor (cabeçalho + formulário + barra de ações)
   ------------------------------------------------------------ */

function DeleteButton({ onDelete, disabled }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(timer);
  }, [confirming]);

  if (confirming) {
    return (
      <Button variant="danger-solid" onClick={onDelete} disabled={disabled}>
        Confirmar exclusão
      </Button>
    );
  }
  return (
    <Button variant="danger" onClick={() => setConfirming(true)} disabled={disabled}>
      Excluir
    </Button>
  );
}

export function EntryEditor({ collectionName, slug, isNew }) {
  const { collection } = useCollection(collectionName);
  const entryApi = useEntry({ collectionName, slug, newEntry: isNew });
  const draft = useEntryDraft();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const meta = entityMeta(collectionName);
  const Form = FORMS[collectionName] || GenericForm;
  const { canDelete } = usePermissions();
  const [showAiChat, setShowAiChat] = useState(false);

  useEffect(() => {
    if (!collection) return;
    if (isNew) {
      draft.createEmpty(collection);
    } else {
      entryApi.load();
    }
  }, [collection, isNew, entryApi.load, draft.createEmpty]);

  const handleSave = async () => {
    setShowAiChat(false);
    setBusy(true);
    setNotice(null);
    await entryApi.persist();
    // persist() resolve mesmo em falha de validação (a falha já é
    // notificada pelo motor); só navega se o rascunho salvou mesmo.
    const st = store.getState().entryDraft;
    if (st.isPersisting || st.hasChanged) {
      setNotice('Não foi possível salvar. Verifique os campos obrigatórios e tente de novo.');
      setBusy(false);
    } else {
      // Purga o cache do site (worker) para a edição aparecer já no próximo
      // request. O worker cacheia os fetches do raw (index.json + markdown)
      // por até 5 min; sem isso, mudanças feitas aqui só aparecem depois.
      const saved = st?.draftEntry?.data || {};
      const paths = ['data/index.json'];
      if (saved.slug) paths.push(`content/${collection}/${String(saved.slug)}.md`);
      fetch(`/_purge?paths=${encodeURIComponent(paths.join(','))}`).catch(() => {});
      navigate('collection', { collectionName }, { replace: true });
    }
  };

  const handleCancel = () => {
    setShowAiChat(false);
    draft.discard();
    navigate('collection', { collectionName });
  };

  if (!collection) return <LoadingScreen message="Carregando…" />;
  if (!draft.draftEntry?.data) return <LoadingScreen message="Preparando edição…" />;

  return (
    <>
      <header className="pnl-header pnl-editor-header">
        <div>
          <p className="pnl-breadcrumb">
            <button type="button" className="pnl-breadcrumb-link" onClick={handleCancel}>
              {meta.label}
            </button>
            <span aria-hidden="true"> / </span>
            <span>{isNew ? meta.newLabel : slug}</span>
          </p>
          <h1 className="pnl-title">{isNew ? `Nova ${meta.singular}` : `Editar ${meta.singular}`}</h1>
        </div>
        <button
          className={`pnl-ai-toggle-btn ${showAiChat ? 'pnl-ai-toggle-btn--active' : ''}`}
          onClick={() => setShowAiChat(!showAiChat)}
          title="Assistente IA"
          aria-pressed={showAiChat}
        >
          ✦
        </button>
      </header>

      <div className="pnl-editor-grid">
        <div className="pnl-editor-main">
          {notice ? <p className="pnl-notice">{notice}</p> : null}
          <Form draft={draft} collection={collection} isNew={isNew} />
        </div>

        <aside className="pnl-editor-side">
          <Card>
            <p className="pnl-save-state">
              {draft.isPersisting
                ? 'Salvando…'
                : busy
                  ? 'Processando…'
                  : draft.hasChanged
                    ? 'Alterações não salvas'
                    : 'Tudo salvo'}
            </p>
            {canDelete ? <DeleteButton onDelete={() => entryApi.remove()} disabled={busy || isNew} /> : null}
            <Button variant="ghost" onClick={handleCancel} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar'}
            </Button>
          </Card>
        </aside>
      </div>

      {showAiChat && (
        <AiChatPanel
          isOpen={showAiChat}
          onClose={() => setShowAiChat(false)}
          collectionName={collectionName}
          formData={draft?.draftEntry?.data || {}}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------
   Gate de entrada de notícia (M3): não-admin só edita as próprias
   notícias; as demais abrem em modo leitura.
   ------------------------------------------------------------ */

export function NoticiaEntryGate({ slug, isNew }) {
  const perms = usePermissions();
  const entryApi = useEntry({ collectionName: 'noticia', slug, newEntry: isNew });
  useEffect(() => {
    if (!isNew) entryApi.load();
  }, [isNew, entryApi.load]);
  const entriesState = useAppSelector((s) => s.entries);
  const entry = isNew ? null : entriesState?.entities?.[`noticia.${slug}`];

  if (isNew) {
    if (!perms.canCreateNoticia) {
      return (
        <Forbidden
          title="Sem permissão para publicar"
          message="Vincule seu perfil a um autor (coleção Autores) para criar notícias."
        />
      );
    }
    return <EntryEditor key="noticia/new" collectionName="noticia" isNew />;
  }

  if (!entry) return <LoadingScreen message="Verificando permissão…" />;
  if (perms.canEditNoticia(entry.data?.autor)) {
    return <EntryEditor key={`noticia/${slug}`} collectionName="noticia" slug={slug} />;
  }
  return <NoticiaReadOnly slug={slug} entry={entry} />;
}
