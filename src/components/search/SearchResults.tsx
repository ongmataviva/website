// SearchResults — busca client-side sobre data/index.json (Opção C).
// Substitui o Pagefind: com o conteúdo editorial dinâmico via GitHub, o
// índice Pagefind (gerado do HTML estático) não cobre as notícias. Esta
// busca filtra o índice público por título, resumo e tags, em runtime.
import { useEffect, useMemo, useState } from 'react';
import NewsGrid from '../news/NewsGrid';
import {
  fetchIndex,
  metaAsNoticia,
  buildCategoriasPorSlug,
  ordemDataDesc,
  type SiteIndex,
} from '../../lib/remote';
import './SearchResults.css';

export function SearchResults() {
  const [query, setQuery] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') ?? '';
  });
  const [index, setIndex] = useState<SiteIndex | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchIndex()
      .then((i) => alive && setIndex(i))
      .catch(() => alive && setErro(true));
    return () => {
      alive = false;
    };
  }, []);

  const termos = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );

  const noticias = useMemo(() => {
    if (!index || termos.length === 0) return [];
    return index.noticias
      .map(metaAsNoticia)
      .sort(ordemDataDesc)
      .filter((n) =>
        termos.every((t) =>
          n.titulo.toLowerCase().includes(t) ||
          n.resumo.toLowerCase().includes(t) ||
          n.tags.some((tag) => tag.toLowerCase().includes(t)),
        ),
      );
  }, [index, termos]);

  const categoriasPorSlug = useMemo(
    () => (index ? buildCategoriasPorSlug(index.categorias) : {}),
    [index],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    window.history.replaceState(null, '', `/busca?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="mv-search">
      <form role="search" onSubmit={handleSubmit}>
        <input
          className="mv-search__input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, resumo ou tags…"
          aria-label="Buscar no portal Mata Viva"
        />
      </form>

      {erro && (
        <p className="mv-search__empty">
          Não foi possível carregar o conteúdo. Tente novamente em instantes.
        </p>
      )}

      {!erro && index && termos.length > 0 && (
        <>
          <p className="mv-search__meta">
            {noticias.length} {noticias.length === 1 ? 'resultado' : 'resultados'}
          </p>
          {noticias.length > 0 ? (
            <NewsGrid noticias={noticias} categoriasPorSlug={categoriasPorSlug} />
          ) : (
            <p className="mv-search__empty">
              Nenhuma notícia encontrada para “{query.trim()}”.
            </p>
          )}
        </>
      )}

      {!erro && !index && (
        <p className="mv-search__meta">Carregando…</p>
      )}
    </div>
  );
}

export default SearchResults;
