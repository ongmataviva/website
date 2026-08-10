import type { Autor } from '../types';
import './AuthorByline.css';

export interface AuthorBylineProps {
  autor: Autor;
}

/**
 * Exibição compacta do autor: avatar (ou inicial), nome e cargo.
 */
export function AuthorByline({ autor }: AuthorBylineProps) {
  const initial = autor.title.charAt(0).toUpperCase();

  return (
    <div className="mv-author-byline">
      <div className="mv-author-byline__avatar" aria-hidden="true">
        {initial}
      </div>
      <div className="mv-author-byline__info">
        <span className="mv-author-byline__name">{autor.title}</span>
        {autor.cargo && (
          <span className="mv-author-byline__cargo">{autor.cargo}</span>
        )}
      </div>
    </div>
  );
}

export default AuthorByline;