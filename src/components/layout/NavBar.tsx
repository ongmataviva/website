import { useEffect, useRef, useState } from 'react';
import type { NavLink } from '../types';
import './NavBar.css';

export interface NavBarProps {
  links: NavLink[];
  /** href do link ativo — recebe aria-current="page" e sublinhado de destaque. */
  activeHref?: string;
}

const MENU_ID = 'mv-nav-menu';

/**
 * Barra de navegação fixa no topo. Wordmark serif "Mata Viva" com ponto
 * de destaque no verde amazônico; lista horizontal no desktop e painel
 * empilhado sob um botão (aria-expanded/aria-controls) abaixo de ~48rem.
 * A lupa navega para /busca. Fecha o menu com Escape.
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

          <a
            href="/busca"
            className="mv-nav__search"
            aria-label="Buscar"
          >
            <svg
              className="mv-nav__search-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
              focusable="false"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="16.5"
                y1="16.5"
                x2="21"
                y2="21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
