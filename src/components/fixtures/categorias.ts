// Fixture: categorias de notícias do portal Mata Viva.
import type { Categoria } from '../types';

export const categorias: Categoria[] = [
  {
    slug: 'meio-ambiente',
    nome: 'Meio Ambiente',
    descricao: 'Notícias sobre a fauna, a flora e a conservação da APA Tarumã.',
  },
  {
    slug: 'agua-e-saneamento',
    nome: 'Água e Saneamento',
    descricao: 'Saneamento básico, esgotamento sanitário e recuperação de igarapés.',
  },
  {
    slug: 'comunidade',
    nome: 'Comunidade',
    descricao: 'Mobilização, mutirões e educação ambiental na região da APA Tarumã.',
  },
];

export const categoriasPorSlug: Record<string, Categoria> = Object.fromEntries(
  categorias.map((categoria) => [categoria.slug, categoria]),
);
