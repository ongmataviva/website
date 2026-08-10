import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ─── Notícia ────────────────────────────────────────────────────────

const noticia = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/noticia' }),
  schema: z.object({
    titulo: z.string(),
    slug: z.string(),
    data: z.date(),         // YYYY-MM-DD (YAML date)
    atualizada: z.date().optional(),
    categoria: z.string(),  // references Categoria.slug
    autor: z.string(),      // references Autor.slug
    tags: z.array(z.string()).default([]),
    destaque: z.boolean().default(false),
    imagem: z.string().optional(),
    resumo: z.string(),
  }),
});

// ─── Categoria ──────────────────────────────────────────────────────

const categoria = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/categoria' }),
  schema: z.object({
    slug: z.string(),
    nome: z.string(),
    descricao: z.string().optional(),
    imagem: z.string().optional(),
  }),
});

// ─── Autor ──────────────────────────────────────────────────────────

const autor = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/autor' }),
  schema: z.object({
    title: z.string(),       // nome
    cargo: z.string().optional(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
  }),
});

// ─── Página (misc) ──────────────────────────────────────────────────

const pagina = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/pagina' }),
  schema: z.object({
    slug: z.string(),
    titulo: z.string(),
    imagem: z.string().optional(),
  }),
});

// ─── Export ─────────────────────────────────────────────────────────

export const collections = {
  noticia,
  categoria,
  autor,
  pagina,
};