import type { Noticia, Categoria } from '../types';
import { NewsCard } from './NewsCard';
import './NewsGrid.css';

export interface NewsGridProps {
  noticias: Noticia[];
  showExcerpt?: boolean;
  /** Lookup para resolver slug da categoria em nome exibível nos cards. */
  categoriasPorSlug?: Record<string, Categoria>;
}

/**
 * Grade responsiva de cartões de notícia. Usa CSS Grid com auto-fill
 * e colunas de no mínimo 18rem.
 */
export function NewsGrid({
  noticias,
  showExcerpt = false,
  categoriasPorSlug,
}: NewsGridProps) {
  return (
    <div className="mv-news-grid" role="list">
      {noticias.map((noticia) => (
        <div className="mv-news-grid__item" role="listitem" key={noticia.slug}>
          <NewsCard
            noticia={noticia}
            showExcerpt={showExcerpt}
            categoriasPorSlug={categoriasPorSlug}
          />
        </div>
      ))}
    </div>
  );
}

export default NewsGrid;