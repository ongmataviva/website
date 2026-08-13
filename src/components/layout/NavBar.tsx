import { useEffect, useRef, useState } from 'react';
import type { NavLink } from '../types';
import './NavBar.css';

export interface NavBarProps {
  links: NavLink[];
  activeHref?: string;
}

const MENU_ID = 'mv-nav-menu';

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * NavBar redesenhada para o Figma "Igarapé Água Branca".
 * Logo Mata Viva, links centrais, busca + "Buscar" texto, separador vertical,
 * botão DOE AGORA (verde #528C40).
 */
export function NavBar({ links, activeHref }: NavBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen((open) => !open);

  return (
    <nav className="mv-nav" aria-label="Navegação principal">
      <div className="mv-nav__inner">
        <a href="/" className="mv-nav__brand">
          Mata Viva
          <span className="mv-nav__brand-dot" aria-hidden="true" />
        </a>

        <ul
          id={MENU_ID}
          className={`mv-nav__list${menuOpen ? ' mv-nav__list--open' : ''}`}
        >
          {links.map((link) => {
            const active = link.href === activeHref;
            return (
              <li key={link.href} className="mv-nav__item">
                <a
                  href={link.href}
                  className={`mv-nav__link${active ? ' mv-nav__link--active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="mv-nav__actions">
          <a href="/busca" className="mv-nav__search" aria-label="Buscar">
            {SEARCH_ICON}
            <span className="mv-nav__search-label">Buscar</span>
          </a>

          <span className="mv-nav__separator" aria-hidden="true" />

          <a href="/doar" className="mv-nav__cta">
            DOE AGORA
          </a>

          <button
            ref={toggleRef}
            type="button"
            className="mv-nav__toggle"
            aria-expanded={menuOpen}
            aria-controls={MENU_ID}
            onClick={toggleMenu}
          >
            <span className="mv-nav__toggle-dot" aria-hidden="true" />
            <span className="mv-nav__toggle-label">
              {menuOpen ? 'Fechar' : 'Menu'}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;