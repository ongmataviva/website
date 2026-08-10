import type { Noticia, Categoria } from '../types';
import { formatDateBR } from '../format';
import './HeroSpotlight.css';

export interface HeroSpotlightProps {
  noticia: Noticia;
  /** Lookup para resolver slug da categoria em nome exibível. */
  categoriasPorSlug?: Record<string, Categoria>;
}

/**
 * Hero da homepage exibindo a notícia em destaque com imagem de fundo,
 * gradiente de sobreposição, badge de categoria, título, resumo e link
 * para o artigo completo.
 */
export function HeroSpotlight({ noticia, categoriasPorSlug }: HeroSpotlightProps) {
  const categoriaNome = categoriasPorSlug?.[noticia.categoria]?.nome;

  return (
    <article className="mv-hero">
      <div className="mv-hero__bg">
        {noticia.imagem ? (
          <img
            className="mv-hero__img"
            src={noticia.imagem}
            alt=""
            aria-hidden="true"
          />
        ) : (
          <div className="mv-hero__placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="mv-hero__overlay" />
      <div className="mv-hero__content">
        <div className="mv-hero__header">
          {categoriaNome && (
            <span className="mv-hero__categoria">{categoriaNome}</span>
          )}
          <time className="mv-hero__data" dateTime={noticia.data}>
            {formatDateBR(noticia.data)}
          </time>
        </div>
        <h1 className="mv-hero__titulo">
          <a href={`/noticias/${noticia.slug}`} className="mv-hero__link">
            {noticia.titulo}
          </a>
        </h1>
        <p className="mv-hero__resumo">{noticia.resumo}</p>
        <a
          href={`/noticias/${noticia.slug}`}
          className="mv-hero__cta"
        >
          Ler notícia
        </a>
      </div>
    </article>
  );
}

export default HeroSpotlight;