import { useEffect, useMemo, useRef, useState } from 'react';
import { useCollection, useEntry, useAppSelector } from '@laikacms/decap-cms/core';
import { Badge, Button, EmptyState, Input, PageHeader } from './ui';
import { ENTITIES, entityMeta } from './entities';
import { navigate } from './routing';
import { usePermissions } from './permissions';

/* ------------------------------------------------------------
   Ações de linha (excluir atrás de menu de contexto ⋮, com
   confirmação em dois passos dentro do próprio menu)
   ------------------------------------------------------------ */

function RowActions({ collectionName, slug, canDelete }) {
  const { remove } = useEntry({ collectionName, slug });
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menuRef = useRef(null);

  const close = () => {
    setOpen(false);
    setConfirming(false);
  };

  // Fecha ao clicar fora ou pressionar Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // A confirmação desarma sozinha após 3,5s (mesmo comportamento anterior).
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(timer);
  }, [confirming]);

  // M3 — exclusão é privilégio de admin (decidido no CollectionList).
  if (!canDelete) return null;

  return (
    <div className="pnl-menu" ref={menuRef}>
      <button
        type="button"
        className="pnl-btn pnl-btn--ghost pnl-btn--icon pnl-menu-btn"
        aria-label="Mais ações"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ⋮
      </button>
      {open ? (
        <div className="pnl-menu-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            className={confirming ? 'pnl-menu-item pnl-menu-item--danger-solid' : 'pnl-menu-item pnl-menu-item--danger'}
            onClick={(e) => {
              e.stopPropagation();
              if (confirming) {
                remove();
                close();
              } else {
                setConfirming(true);
              }
            }}
          >
            {confirming ? 'Confirmar exclusão' : 'Excluir'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------
   Linhas por entidade (tela otimizada por entidade)
   ------------------------------------------------------------ */

function NoticiaRow({ entry, onEdit, canDelete }) {
  const d = entry.data || {};
  return (
    <div className="pnl-row">
      {d.imagem ? <img className="pnl-thumb" src={d.imagem} alt="" /> : <span className="pnl-thumb" />}
      <div className="pnl-row-main" role="button" tabIndex={0} onClick={onEdit} onKeyDown={(e) => e.key === 'Enter' && onEdit()}>
        <p className="pnl-row-title">{d.titulo || 'Sem título'}</p>
        <div className="pnl-row-meta">
          {d.categoria ? <Badge variant="accent">{d.categoria}</Badge> : null}{' '}
          {d.autor ? <span>{d.autor}</span> : null} · {d.data ? String(d.data).slice(0, 10) : 'sem data'}
        </div>
      </div>
      {d.destaque ? <Badge variant="featured">Destaque</Badge> : null}
      <div className="pnl-row-actions">
        <RowActions collectionName="noticia" slug={entry.slug} canDelete={canDelete} />
      </div>
    </div>
  );
}

function CategoriaRow({ entry, onEdit, canDelete }) {
  const d = entry.data || {};
  return (
    <div className="pnl-row">
      <div className="pnl-row-main" role="button" tabIndex={0} onClick={onEdit} onKeyDown={(e) => e.key === 'Enter' && onEdit()}>
        <p className="pnl-row-title">{d.nome || 'Sem nome'}</p>
        <div className="pnl-row-meta">{d.slug ? `/${d.slug}` : 'sem slug'}</div>
      </div>
      <div className="pnl-row-actions">
        <RowActions collectionName="categoria" slug={entry.slug} canDelete={canDelete} />
      </div>
    </div>
  );
}

function AutorRow({ entry, onEdit, canDelete }) {
  const d = entry.data || {};
  return (
    <div className="pnl-row">
      {d.avatar ? <img className="pnl-avatar" src={d.avatar} alt="" /> : <span className="pnl-avatar" />}
      <div className="pnl-row-main" role="button" tabIndex={0} onClick={onEdit} onKeyDown={(e) => e.key === 'Enter' && onEdit()}>
        <p className="pnl-row-title">{d.title || 'Sem nome'}</p>
        {d.cargo ? <div className="pnl-row-meta">{d.cargo}</div> : null}
      </div>
      <div className="pnl-row-actions">
        <RowActions collectionName="autor" slug={entry.slug} canDelete={canDelete} />
      </div>
    </div>
  );
}

function PaginaRow({ entry, onEdit, canDelete }) {
  const d = entry.data || {};
  return (
    <div className="pnl-row">
      <div className="pnl-row-main" role="button" tabIndex={0} onClick={onEdit} onKeyDown={(e) => e.key === 'Enter' && onEdit()}>
        <p className="pnl-row-title">{d.titulo || 'Sem título'}</p>
        <div className="pnl-row-meta">{d.slug ? `/${d.slug}` : 'sem slug'}</div>
      </div>
      <div className="pnl-row-actions">
        <RowActions collectionName="pagina" slug={entry.slug} canDelete={canDelete} />
      </div>
    </div>
  );
}

function renderRow(collectionName, entry, onEdit, canDelete) {
  switch (collectionName) {
    case 'noticia':
      return <NoticiaRow key={entry.slug} entry={entry} onEdit={onEdit} canDelete={canDelete} />;
    case 'categoria':
      return <CategoriaRow key={entry.slug} entry={entry} onEdit={onEdit} canDelete={canDelete} />;
    case 'autor':
      return <AutorRow key={entry.slug} entry={entry} onEdit={onEdit} canDelete={canDelete} />;
    case 'pagina':
      return <PaginaRow key={entry.slug} entry={entry} onEdit={onEdit} canDelete={canDelete} />;
    default:
      return (
        <div key={entry.slug} className="pnl-row">
          <div className="pnl-row-main">
            <p className="pnl-row-title">{entry.slug}</p>
          </div>
        </div>
      );
  }
}

/* ------------------------------------------------------------
   Lista da coleção (carrega entradas via motor headless)
   ------------------------------------------------------------ */

export function CollectionList({ collectionName }) {
  const { collection } = useCollection(collectionName);
  const { loadAll, collectionEntriesLoaded } = useEntry({ collectionName });
  const entriesState = useAppSelector((state) => state.entries);
  const [query, setQuery] = useState('');
  const meta = entityMeta(collectionName);

  useEffect(() => {
    if (collection && !collectionEntriesLoaded) {
      loadAll();
    }
  }, [collection, collectionEntriesLoaded, loadAll]);

  const page = entriesState?.pages?.[collectionName];
  const ids = page?.ids ?? [];
  const isFetching = page?.isFetching ?? false;

  const entries = useMemo(
    () => ids.map((id) => entriesState.entities[`${collectionName}.${id}`]).filter(Boolean),
    [entriesState, collectionName, ids],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = entries.filter((e) => {
      if (!q) return true;
      const d = e.data || {};
      const haystack = [e.slug, d.titulo, d.nome, d.title, d.slug, d.cargo]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
    // Notícias mais recentes primeiro; demais em ordem alfabética.
    const sorted = [...list].sort((a, b) => {
      const da = a.data?.data ? String(a.data.data) : '';
      const db = b.data?.data ? String(b.data.data) : '';
      if (da || db) return db.localeCompare(da);
      return (a.data?.titulo || a.data?.nome || a.data?.title || a.slug).localeCompare(
        b.data?.titulo || b.data?.nome || b.data?.title || b.slug,
      );
    });
    return sorted;
  }, [entries, query]);

  const goNew = () => navigate('entryNew', { collectionName });
  const goEdit = (slug) => navigate('entry', { collectionName, slug });

  // M3 — permissões: notícia exige autor vinculado; demais coleções, admin.
  const perms = usePermissions();
  const canCreate = collectionName === 'noticia' ? perms.canCreateNoticia : perms.isAdmin;
  const createHint =
    collectionName === 'noticia'
      ? 'Vincule seu perfil a um autor para publicar.'
      : 'Somente administradores.';

  return (
    <>
      <PageHeader title={meta.label} subtitle={meta.description}>
        <div className="pnl-header-stack">
          <Button variant="primary" onClick={goNew} disabled={!canCreate} title={canCreate ? undefined : createHint}>
            {meta.newLabel}
          </Button>
          {!canCreate ? <span className="pnl-hint">{createHint}</span> : null}
        </div>
      </PageHeader>

      <div className="pnl-toolbar">
        <Input
          type="search"
          placeholder="Buscar…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar entradas"
        />
        <span className="pnl-toolbar-spacer" />
        <span className="pnl-hint">
          {filtered.length} de {entries.length} {entries.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      <div className="pnl-card pnl-list">
        {isFetching && entries.length === 0 ? (
          <EmptyState title="Carregando…" />
        ) : filtered.length === 0 ? (
          <EmptyState title={query ? 'Nada encontrado' : 'Nenhum registro ainda'}>
            {query ? 'Ajuste a busca.' : `Crie a primeira ${meta.singular} com o botão acima.`}
          </EmptyState>
        ) : (
          filtered.map((entry) => renderRow(collectionName, entry, () => goEdit(entry.slug), perms.canDelete))
        )}
      </div>
    </>
  );
}
