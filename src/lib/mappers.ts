// Mappers: convertem entradas das content collections (Astro) nos tipos
// do contrato de dados dos componentes (src/components/types.ts).
// O Astro entrega Dates e markdown cru; os componentes esperam ISO strings
// e HTML pré-renderizado.
import type { CollectionEntry } from 'astro:content';
import type {
  Autor,
  Categoria,
  Noticia,
  Pagina,
} from '../components/types';
import { mdToHtml } from './markdown';

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

/** Ordena por data decrescente (ISO string). */
export const ordemDataDesc = <T extends { data: string }>(a: T, b: T): number =>
  b.data.localeCompare(a.data);

export function mapNoticia(entry: CollectionEntry<'noticia'>): Noticia {
  return {
    slug: entry.id,
    titulo: entry.data.titulo,
    data: isoDate(entry.data.data),
    atualizada: entry.data.atualizada
      ? entry.data.atualizada.toISOString()
      : undefined,
    categoria: entry.data.categoria,
    autor: entry.data.autor,
    tags: entry.data.tags,
    destaque: entry.data.destaque,
    imagem: entry.data.imagem,
    resumo: entry.data.resumo,
    corpoHtml: mdToHtml(entry.body),
  };
}

export function mapCategoria(entry: CollectionEntry<'categoria'>): Categoria {
  return {
    slug: entry.data.slug,
    nome: entry.data.nome,
    descricao: entry.data.descricao,
    imagem: entry.data.imagem,
  };
}

export function mapAutor(entry: CollectionEntry<'autor'>): Autor {
  return {
    slug: entry.id,
    title: entry.data.title,
    cargo: entry.data.cargo,
    bio: entry.data.bio,
    avatar: entry.data.avatar,
  };
}

export function mapPagina(entry: CollectionEntry<'pagina'>): Pagina {
  return {
    slug: entry.id,
    titulo: entry.data.titulo,
    imagem: entry.data.imagem,
    corpoHtml: mdToHtml(entry.body),
  };
}

// ─── Lookups por slug ────────────────────────────────────────────────

export function buildCategoriasPorSlug(
  entries: CollectionEntry<'categoria'>[],
): Record<string, Categoria> {
  return Object.fromEntries(entries.map((e) => [e.data.slug, mapCategoria(e)]));
}

export function buildAutoresPorSlug(
  entries: CollectionEntry<'autor'>[],
): Record<string, Autor> {
  return Object.fromEntries(entries.map((e) => [e.id, mapAutor(e)]));
}
