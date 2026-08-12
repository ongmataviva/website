// Data layer client — Opção C.
// O conteúdo editorial vive no repositório público ongmataviva/website e é
// servido via raw.githubusercontent.com. O site é um esqueleto estático; as
// páginas de conteúdo buscam os dados aqui em runtime — sem rebuild a cada
// notícia. As listagens usam data/index.json (gerado por GitHub Action no
// push); artigos e páginas institucionais buscam o .md individual e
// pré-renderizam o corpo com o mesmo mdToHtml usado no build.
import type { Autor, Categoria, Noticia, Pagina } from '../components/types';
import { mdToHtml } from './markdown';

export const REPO = 'ongmataviva/website';
export const BRANCH = 'content';
export const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;

export type NoticiaMeta = Omit<Noticia, 'corpoHtml'>;
export type PaginaMeta = Omit<Pagina, 'corpoHtml'>;

export interface SiteIndex {
  geradoEm: string;
  noticias: NoticiaMeta[];
  categorias: Categoria[];
  autores: Autor[];
  paginas: PaginaMeta[];
}

export async function fetchIndex(): Promise<SiteIndex> {
  // cache: 'no-store' — nunca servir o índice stale do cache do navegador
  // (raw.githubusercontent envia max-age=300; sem isso, edições do admin
  // demoravam até 5 min para aparecer).
  const res = await fetch(`${RAW_BASE}/data/index.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`index indisponível (${res.status})`);
  return res.json();
}

/** Busca um documento markdown bruto (frontmatter + corpo) do repositório. */
export async function fetchMarkdown(
  collection: 'noticia' | 'pagina',
  slug: string,
): Promise<{ data: Record<string, unknown>; body: string }> {
  const res = await fetch(`${RAW_BASE}/content/${collection}/${slug}.md`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`documento não encontrado (${res.status})`);
  return parseFrontmatter(await res.text());
}

// ─── Frontmatter (subset YAML usado no conteúdo do portal) ───────────

/**
 * Separa o bloco frontmatter (delimitado por ---) do corpo markdown.
 * Suporta o subset de YAML das coleções: chave: valor escalar e listas
 * de itens em linhas (- item). Datas ficam como strings ISO.
 */
export function parseFrontmatter(text: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  return { data: parseYaml(m[1]), body: text.slice(m[0].length) };
}

function parseScalar(raw: string): unknown {
  const v = raw.trim();
  if (
    (v.startsWith("'") && v.endsWith("'") && v.length > 1) ||
    (v.startsWith('"') && v.endsWith('"') && v.length > 1)
  ) {
    return v.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  return v.split(' #')[0].trim();
}

function parseYaml(src: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = src.split(/\r?\n/);
  let listKey: string | null = null;
  const list: string[] = [];

  const flushList = () => {
    if (listKey) {
      out[listKey] = list.splice(0);
      listKey = null;
    }
  };

  for (const line of lines) {
    if (/^\s*-\s+/.test(line)) {
      list.push(String(parseScalar(line.replace(/^\s*-\s+/, ''))));
      continue;
    }
    flushList();
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const value = kv[2].trim();
    if (value === '') {
      listKey = key;
    } else {
      out[key] = parseScalar(value);
    }
  }
  flushList();
  return out;
}

// ─── Mappers: frontmatter → tipos do contrato dos componentes ────────

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function noticiaFromFrontmatter(
  slug: string,
  data: Record<string, unknown>,
  body: string,
): Noticia {
  return {
    slug,
    titulo: str(data.titulo),
    data: str(data.data),
    atualizada: data.atualizada ? str(data.atualizada) : undefined,
    categoria: str(data.categoria),
    autor: str(data.autor),
    tags: Array.isArray(data.tags) ? data.tags.map(str) : [],
    destaque: data.destaque === true,
    imagem: data.imagem ? str(data.imagem) : undefined,
    resumo: str(data.resumo),
    corpoHtml: mdToHtml(body),
  };
}

export function paginaFromFrontmatter(
  slug: string,
  data: Record<string, unknown>,
  body: string,
): Pagina {
  return {
    slug,
    titulo: str(data.titulo),
    imagem: data.imagem ? str(data.imagem) : undefined,
    corpoHtml: mdToHtml(body),
  };
}

/** Metadados do índice → Noticia completa (corpo vazio; usado em listagens). */
export function metaAsNoticia(meta: NoticiaMeta): Noticia {
  return { ...meta, corpoHtml: '' };
}

export function buildCategoriasPorSlug(
  categorias: Categoria[],
): Record<string, Categoria> {
  return Object.fromEntries(categorias.map((c) => [c.slug, c]));
}

export function buildAutoresPorSlug(
  autores: Autor[],
): Record<string, Autor> {
  return Object.fromEntries(autores.map((a) => [a.slug, a]));
}

/** Ordena por data decrescente (ISO string). */
export const ordemDataDesc = <T extends { data: string }>(a: T, b: T): number =>
  b.data.localeCompare(a.data);
