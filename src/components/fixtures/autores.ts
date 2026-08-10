// Fixture: autores do portal — espelha os arquivos em content/authors/.
import type { Autor } from '../types';

export const autores: Autor[] = [
  {
    slug: 'alt-goncalves',
    title: 'Alt Gonçalves',
    cargo: 'Voluntário · Sistemas e Dados',
  },
  {
    slug: 'equipe-mata-viva',
    title: 'Equipe Mata Viva',
    cargo: 'Comunicação da associação',
  },
  {
    slug: 'joana-martins',
    title: 'Joana Martins',
    cargo: 'Voluntária · Educação Ambiental',
  },
];

export const autoresPorSlug: Record<string, Autor> = Object.fromEntries(
  autores.map((autor) => [autor.slug, autor]),
);
