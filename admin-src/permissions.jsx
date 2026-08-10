import { useEffect, useMemo } from 'react';
import { useAuth, useConfig, useEntry, useAppSelector } from '@laikacms/decap-cms/core';

/* ============================================================
   Permissões do Painel (M3) — vínculo Autor ↔ usuário autenticado.

   - Admin: logins da chave `admin_logins` do config.yml (GitHub).
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
  const isAdmin = isDevProxy || (login !== '' && adminLogins.includes(login));

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
