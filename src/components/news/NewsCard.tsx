import type { Noticia, Categoria } from '../types';
import { formatDateShortBR } from '../format';
import './NewsCard.css';

export interface NewsCardProps {
  noticia: Noticia;
  showExcerpt?: boolean;
  /** Lookup para resolver slug da categoria em nome exibível. */
  categoriasPorSlug?: Record<string, Categoria>;
}

/**
 * Cartão de notícia com imagem (ou placeholder), badge de categoria,
 * título, data em formato curto e, opcionalmente, o resumo.
 * Links para a página do artigo completo.
 */
export function NewsCard({
  noticia,
  showExcerpt = false,
  categoriasPorSlug,
}: NewsCardProps) {
  const categoriaNome = categoriasPorSlug?.[noticia.categoria]?.nome;

  return (
    <article className="mv-news-card">
      <a
        href={`/noticias/${noticia.slug}`}
        className="mv-news-card__link"
        aria-label={noticia.titulo}
      >
        <div className="mv-news-card__media">
          {noticia.imagem ? (
            <img
              className="mv-news-card__img"
              src={noticia.imagem}
              alt=""
              aria-hidden="true"
              loading="lazy"
            />
          ) : (
            <div className="mv-news-card__placeholder" aria-hidden="true" />
          )}
          {categoriaNome && (
            <span className="mv-news-card__categoria">{categoriaNome}</span>
          )}
        </div>
        <div className="mv-news-card__body">
          <time className="mv-news-card__data" dateTime={noticia.data}>
            {formatDateShortBR(noticia.data)}
          </time>
          <h2 className="mv-news-card__titulo">{noticia.titulo}</h2>
          {showExcerpt && (
            <p className="mv-news-card__excerpt">{noticia.resumo}</p>
          )}
        </div>
      </a>
    </article>
  );
}

export default NewsCard;