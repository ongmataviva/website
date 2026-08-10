import type { Noticia, Autor } from '../types';
import { formatDateBR } from '../format';
import { TagList } from './TagList';
import './ArticleHeader.css';

export interface ArticleHeaderProps {
  noticia: Noticia;
  autor: Autor;
}

/**
 * Cabeçalho de página de artigo: título, autoria, data, tags e
 * opcionalmente data de atualização.
 */
export function ArticleHeader({ noticia, autor }: ArticleHeaderProps) {
  return (
    <header className="mv-article-header">
      <h1 className="mv-article-header__title">{noticia.titulo}</h1>

      <div className="mv-article-header__meta">
        <p className="mv-article-header__byline">
          Por{' '}
          <a
            className="mv-article-header__author-link"
            href={`/autor/${autor.slug}`}
          >
            {autor.title}
          </a>
        </p>
        <time className="mv-article-header__date" dateTime={noticia.data}>
          {formatDateBR(noticia.data)}
        </time>
      </div>

      {noticia.atualizada && (
        <p className="mv-article-header__updated">
          Atualizada em{' '}
          <time dateTime={noticia.atualizada}>
            {formatDateBR(noticia.atualizada.slice(0, 10))}
          </time>
        </p>
      )}

      <TagList tags={noticia.tags} />

      <hr className="mv-article-header__divider" />
    </header>
  );
}

export default ArticleHeader;