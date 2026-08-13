// Fixture: navegação do portal — espelha os links de menu e rodapé do site.
import type { NavLink } from '../types';

export const navLinks: NavLink[] = [
  { label: 'Início', href: '/' },
  { label: 'Sobre', href: '/sobre' },
  { label: 'Causas', href: '/causas' },
  { label: 'Notícias', href: '/noticias' },
  { label: 'Contato', href: '/contato' },
];

export const footerLinks: NavLink[] = [
  { label: 'Início', href: '/' },
  { label: 'Sobre', href: '/sobre' },
  { label: 'Causas', href: '/causas' },
  { label: 'Notícias', href: '/noticias' },
  { label: 'Contato', href: '/contato' },
];
