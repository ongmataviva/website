import type { Pagina } from './types';
import './PageShell.css';

export interface PageShellProps {
  pagina: Pagina;
}

/**
 * Página genérica para conteúdo institucional (sobre, projetos,
 * contato). Renderiza título, imagem opcional e corpo HTML.
 */
export function PageShell({ pagina }: PageShellProps) {
  return (
    <article className="mv-page-shell">
      <h1 className="mv-page-shell__title">{pagina.titulo}</h1>
      {pagina.imagem && (
        <img
          className="mv-page-shell__img"
          src={pagina.imagem}
          alt={pagina.titulo}
        />
      )}
      {pagina.corpoHtml && (
        <div
          className="mv-page-shell__body"
          dangerouslySetInnerHTML={{ __html: pagina.corpoHtml }}
        />
      )}
    </article>
  );
}

export default PageShell;