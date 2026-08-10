// Fixture: páginas institucionais do portal Mata Viva (sobre, projetos, contato).
import type { Pagina } from '../types';

export const paginas: Pagina[] = [
  {
    slug: 'sobre',
    titulo: 'Sobre a Mata Viva',
    corpoHtml:
      '<p>A Associação Mata Viva é uma organização não governamental que atua na bacia do Igarapé Água Branca, dentro da APA Tarumã, em Manaus/AM.</p><p>Nosso trabalho reúne mobilização de moradores, mutirões de limpeza e educação ambiental.</p>',
  },
  {
    slug: 'projetos',
    titulo: 'Projetos',
    corpoHtml:
      '<p>Os projetos da Mata Viva combinam ação comunitária e educação ambiental para proteger o Igarapé Água Branca e a APA Tarumã.</p><p>Entre eles estão os mutirões de limpeza, as oficinas de educação ambiental com escolas da região e as campanhas de preservação junto aos moradores.</p>',
  },
  {
    slug: 'contato',
    titulo: 'Contato',
    corpoHtml:
      '<p>Quer participar das ações da associação ou falar com a equipe? Fale com a gente.</p><ul><li>E-mail: contato@mataviva.org.br</li><li>WhatsApp: (92) 90000-0000</li></ul>',
  },
];

export const paginasPorSlug: Record<string, Pagina> = Object.fromEntries(
  paginas.map((pagina) => [pagina.slug, pagina]),
);
