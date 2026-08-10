#!/usr/bin/env node
// build-content-index.mjs — gera data/index.json a partir de content/.
// Roda no GitHub Actions (push em content/**) e localmente (pnpm run content:index).
// O index.json é o índice público consumido pelo site em runtime (Opção C):
// listagens (/ , /noticias, /categoria/*, /autor/*, /tag/*) e busca client-side.
// Os artigos/páginas em si continuam sendo servidos como .md via raw.githubusercontent.
import fs from 'node:fs';
import path from 'node:path';
import { load, JSON_SCHEMA } from 'js-yaml';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'data', 'index.json');

function readEntry(rel) {
  const file = path.join(ROOT, rel);
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  let data = {};
  try {
    data = load(m[1], { schema: JSON_SCHEMA }) || {};
  } catch {
    data = {};
  }
  return { data, body: text.slice(m[0].length) };
}

const slugOf = (file) => path.basename(file, '.md');

const files = (dir) => {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d)
    .filter((f) => f.endsWith('.md'))
    .sort();
};

const noticias = files('content/noticia').map((f) => {
  const { data } = readEntry(`content/noticia/${f}`);
  return {
    slug: slugOf(f),
    titulo: data.titulo,
    data: data.data,
    atualizada: data.atualizada,
    categoria: data.categoria,
    autor: data.autor,
    tags: data.tags || [],
    destaque: data.destaque === true,
    imagem: data.imagem,
    resumo: data.resumo,
  };
});

const categorias = files('content/categoria').map((f) => {
  const { data } = readEntry(`content/categoria/${f}`);
  return {
    slug: data.slug || slugOf(f),
    nome: data.nome,
    descricao: data.descricao,
    imagem: data.imagem,
  };
});

const autores = files('content/autor').map((f) => {
  const { data } = readEntry(`content/autor/${f}`);
  return {
    slug: slugOf(f),
    title: data.title,
    cargo: data.cargo,
    bio: data.bio,
    avatar: data.avatar,
  };
});

const paginas = files('content/pagina').map((f) => {
  const { data } = readEntry(`content/pagina/${f}`);
  return { slug: slugOf(f), titulo: data.titulo, imagem: data.imagem };
});

const index = {
  geradoEm: new Date().toISOString(),
  noticias,
  categorias,
  autores,
  paginas,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(index, null, 2) + '\n');
console.log(
  `content-index: ${noticias.length} noticias, ${categorias.length} categorias, ` +
    `${autores.length} autores, ${paginas.length} paginas -> ${path.relative(ROOT, OUT)}`,
);
