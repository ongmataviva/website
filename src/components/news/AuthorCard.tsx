import type { Autor } from '../types';
import './AuthorCard.css';

export interface AuthorCardProps {
  autor: Autor;
}

/**
 * Cartão de autor completo para páginas de autor: avatar (ou círculo
 * com iniciais), nome, cargo e biografia.
 */
export function AuthorCard({ autor }: AuthorCardProps) {
  const initials = autor.title
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="mv-author-card">
      <div className="mv-author-card__avatar">
        {autor.avatar ? (
          <img
            className="mv-author-card__img"
            src={autor.avatar}
            alt={autor.title}
          />
        ) : (
          <span className="mv-author-card__initials" aria-hidden="true">
            {initials}
          </span>
        )}
      </div>
      <div className="mv-author-card__body">
        <h1 className="mv-author-card__name">{autor.title}</h1>
        {autor.cargo && <p className="mv-author-card__cargo">{autor.cargo}</p>}
        {autor.bio && <p className="mv-author-card__bio">{autor.bio}</p>}
      </div>
    </article>
  );
}

export default AuthorCard;