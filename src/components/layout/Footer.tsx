import type { NavLink } from '../types';
import './Footer.css';

export interface FooterProps {
  links: NavLink[];
}

const MISSION =
  'Vigilância ambiental e transparência na bacia do Igarapé Água Branca — APA Tarumã, Manaus/AM.';

/**
 * Rodapé editorial: wordmark, missão em uma linha, lista de links e
 * linha de direitos. Borda superior de fio de cabelo, papel quente e
 * respiro generoso (--space-16).
 */
export function Footer({ links }: FooterProps) {
  return (
    <footer className="mv-footer">
      <div className="mv-footer__inner">
        <div className="mv-footer__brand">
          <p className="mv-footer__name">
            Mata Viva
            <span className="mv-footer__dot" aria-hidden="true" />
          </p>
          <p className="mv-footer__mission">{MISSION}</p>
        </div>

        <nav className="mv-footer__nav" aria-label="Links do rodapé">
          <ul className="mv-footer__list">
            {links.map((link) => (
              <li key={link.href}>
                <a className="mv-footer__link" href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mv-footer__copy">© 2026 Associação Mata Viva</p>
      </div>
    </footer>
  );
}

export default Footer;
