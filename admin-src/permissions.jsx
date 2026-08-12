import { useEffect, useMemo, useState } from 'react';
import { useAuth, useConfig, useEntry, useAppSelector } from '@laikacms/decap-cms/core';

/* ============================================================
   Permissões do Painel (M3) — vínculo Autor ↔ usuário autenticado.

   - Admin: quem decide é o Worker (/api/me), a partir do bootstrap
     (ADMIN_EMAILS, secret) ∪ lista assinada de admins
     (data/editor_logins.json). O painel nunca vê a chave HMAC.
   - canEditList: quem tem o cookie de admin (bootstrap) — só essa
     pessoa gerencia a lista de equipe pela página /equipe.
   - Vínculo: autor da coleção `autor` cujo campo `login` casa com
     `user.login` (1:1, case-insensitive).
   - Não-admin só cria notícia se tiver autor vinculado (o campo
     autor é pré-preenchido e travado) e só edita as próprias.
   - Coleções autor/categoria/pagina e exclusões: apenas admin.
   - No backend local (proxy, dev/Storybook) trata como admin para
     não travar o fluxo offline-first.
   ============================================================ */

const norm = (s) => String(s || '').trim().toLowerCase();

export function usePermissions() {
  const { user } = useAuth();
  const { config, backend } = useConfig();
  const aut = useEntry({ collectionName: 'autor' });
  const entriesState = useAppSelector((s) => s.entries);

  useEffect(() => {
    if (aut.collection && !aut.collectionEntriesLoaded) aut.loadAll();
  }, [aut.collection, aut.collectionEntriesLoaded, aut.loadAll]);

  const login = norm(user?.login);
  const isDevProxy = backend?.name === 'proxy';

  const adminLogins = useMemo(
    () => (Array.isArray(config?.admin_logins) ? config.admin_logins.map(norm) : []),
    [config],
  );

  // Autoridade real (produção): o Worker responde quem é admin e quem
  // pode gerir a lista de equipe. O fallback do config.yml só vale em
  // dev/Storybook (proxy trata tudo como admin de qualquer forma).
  const [server, setServer] = useState({ isAdmin: false, canEditList: false, loaded: false });
  useEffect(() => {
    let alive = true;
    if (isDevProxy) {
      setServer({ isAdmin: true, canEditList: true, loaded: true });
      return () => { alive = false; };
    }
    if (!login) {
      setServer({ isAdmin: false, canEditList: false, loaded: true });
      return () => { alive = false; };
    }
    fetch(`/api/me?email=${encodeURIComponent(login)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setServer({
          isAdmin: Boolean(d?.isAdmin),
          canEditList: Boolean(d?.canEditList),
          loaded: true,
        });
      })
      .catch(() => {
        if (alive) setServer((s) => ({ ...s, loaded: true }));
      });
    return () => { alive = false; };
  }, [login, isDevProxy]);

  const isAdmin =
    isDevProxy || server.isAdmin || (login !== '' && adminLogins.includes(login));
  const canEditList = isDevProxy || server.canEditList;

  const myAutorSlug = useMemo(() => {
    const page = entriesState?.pages?.autor;
    const ids = page?.ids ?? [];
    for (const id of ids) {
      const e = entriesState.entities?.[`autor.${id}`];
      if (e && norm(e.data?.login) === login) return e.data?.slug || e.slug;
    }
    return null;
  }, [entriesState, login]);

  return {
    isAdmin,
    canEditList, // gestão da equipe (página /equipe) — só bootstrap
    myAutorSlug, // slug do autor vinculado ao usuário logado (ou null)
    canCreateNoticia: isAdmin || !!myAutorSlug,
    canEditNoticia(autorSlug) {
      return isAdmin || (!!myAutorSlug && String(autorSlug || '') === myAutorSlug);
    },
    canEditCollection(collectionName) {
      return isAdmin || collectionName === 'noticia';
    },
    canDelete: isAdmin,
  };
}
