// Fixture: navegação do portal — espelha os links de menu e rodapé do site.
import type { NavLink } from '../types';

export const navLinks: NavLink[] = [
  { label: 'Notícias', href: '/noticias' },
  { label: 'Projetos', href: '/projetos' },
  { label: 'Contato', href: '/contato' },
];

export const footerLinks: NavLink[] = [
  { label: 'Sobre', href: '/sobre' },
  { label: 'Projetos', href: '/projetos' },
  { label: 'Contato', href: '/contato' },
];
