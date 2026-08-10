import type { ReactNode } from 'react';
import type { NavLink } from '../types';
import NavBar from './NavBar';
import Footer from './Footer';
import './SiteShell.css';

export interface SiteShellProps {
  navLinks: NavLink[];
  activeHref?: string;
  footerLinks: NavLink[];
  children: ReactNode;
}

const MAIN_ID = 'conteudo';

/**
 * Estrutura base da página pública: link de salto ("Pular para o
 * conteúdo"), cabeçalho com NavBar, <main id="conteudo"> e rodapé.
 * Conteúdo centralizado em até ~72rem com respiro horizontal.
 */
export function SiteShell({
  navLinks,
  activeHref,
  footerLinks,
  children,
}: SiteShellProps) {
  return (
    <div className="mv-shell">
      <a className="mv-shell__skip" href={`#${MAIN_ID}`}>
        Pular para o conteúdo
      </a>

      <header className="mv-shell__header">
        <NavBar links={navLinks} activeHref={activeHref} />
      </header>

      <main id={MAIN_ID} className="mv-shell__main">
        <div className="mv-shell__content">{children}</div>
      </main>

      <Footer links={footerLinks} />
    </div>
  );
}

export default SiteShell;
