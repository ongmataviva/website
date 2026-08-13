// ─────────────────────────────────────────────────────────────
// Mata Viva — Prerender server-side das rotas de conteúdo (SEO).
// ─────────────────────────────────────────────────────────────
// O site é um esqueleto estático (Opção C); o conteúdo vive no
// repositório público ongmataviva/website (data/index.json para
// listagens, content/*.md para artigos e páginas). Este módulo
// roda dentro do Worker e renderiza, para cada rota de conteúdo,
// o mesmo markup/classes dos componentes React do cliente, e o
// injeta no shell único ANTES de responder.
//
// Para crawlers/SEO (sem JS): a página chega completa — <title>,
// <meta name="description"> e o conteúdo renderizado. No navegador,
// o <astro-island> do ContentApp hidrata por cima com a experiência
// SPA idêntica (substitui o conteúdo injetado pela renderização React).
//
// Cache: os fetches ao GitHub usam a Cache API (TTL do raw); a
// resposta final é cacheável na borda via Cache-Control.
// ─────────────────────────────────────────────────────────────

export const REPO = 'ongmataviva/website';
export const BRANCH = 'content';
export const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;

// ─── Tipos (subset do contrato em src/components/types.ts) ────

export interface Categoria {
  slug: string;
  nome: string;
  descricao?: string;
  imagem?: string;
}

export interface Autor {
  slug: string;
  title: string;
  cargo?: string;
  bio?: string;
  avatar?: string;
}

export interface NoticiaMeta {
  slug: string;
  titulo: string;
  data: string;
  atualizada?: string;
  categoria: string;
  autor: string;
  tags: string[];
  destaque: boolean;
  imagem?: string;
  resumo: string;
}

export interface Noticia extends NoticiaMeta {
  corpoHtml: string;
}

export interface Pagina {
  slug: string;
  titulo: string;
  imagem?: string;
  corpoHtml: string;
}

export interface SiteIndex {
  geradoEm: string;
  noticias: NoticiaMeta[];
  categorias: Categoria[];
  autores: Autor[];
  paginas: { slug: string; titulo: string; imagem?: string }[];
}

export type WaitUntil = (p: Promise<unknown>) => void;

// ─── Escaping / markdown (porta de src/lib/markdown.ts) ──────

export function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(md: string): string {
  let out = escapeHtml(md);
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, t) => `<strong>${t}</strong>`);
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, (_m, before, t) => `${before}<em>${t}</em>`);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => `<a href="${url}">${text}</a>`);
  return out;
}

export function mdToHtml(md: string): string {
  const lines = (md ?? '').replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;

  const isBlank = (l: string) => l.trim() === '';
  const isBlockStart = (l: string) =>
    /^(#{1,4})\s+/.test(l) ||
    /^\s*[-*+]\s+/.test(l) ||
    /^\s*\d+\.\s+/.test(l) ||
    /^>\s?/.test(l) ||
    /^```/.test(l) ||
    /^\s*([-*_])\s*(\1\s*){2,}$/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const lang = line.trim().slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      html.push(
        `<pre><code${lang ? ` class="language-${lang}"` : ''}>${escapeHtml(buf.join('\n'))}</code></pre>`,
      );
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      const level = h[1].length;
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      html.push('<hr>');
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html.push(`<blockquote><p>${inline(buf.join(' '))}</p></blockquote>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^\s*[-*+]\s+/, ''))}</li>`);
        i++;
      }
      html.push(`<ul>${buf.join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
        i++;
      }
      html.push(`<ol>${buf.join('')}</ol>`);
      continue;
    }

    if (!isBlank(line)) {
      const buf: string[] = [line];
      i++;
      while (i < lines.length && !isBlank(lines[i]) && !isBlockStart(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      html.push(`<p>${inline(buf.join(' '))}</p>`);
      continue;
    }

    i++;
  }

  return html.join('\n');
}

// ─── Datas pt-BR (porta de src/components/format.ts) ─────────

function formatDateBR(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatDateShortBR(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

// ─── Frontmatter (porta de src/lib/remote.ts) ────────────────

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

function parseFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  return { data: parseYaml(m[1]), body: text.slice(m[0].length) };
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function noticiaFromFrontmatter(
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

function paginaFromFrontmatter(
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

// ─── Rota (espelha o parseRoute do ContentApp) ────────────────

type Route =
  | { kind: 'home' }
  | { kind: 'noticias' }
  | { kind: 'noticia'; slug: string }
  | { kind: 'categoria'; slug: string }
  | { kind: 'autor'; slug: string }
  | { kind: 'tag'; tag: string }
  | { kind: 'custom'; page: 'sobre' | 'projetos' }
  | { kind: 'pagina'; slug: string }
  | { kind: 'notFound' };

function parseRoute(pathname: string): Route {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return { kind: 'home' };
  if (segs.length === 1) {
    if (segs[0] === 'noticias') return { kind: 'noticias' };
    if (segs[0] === 'sobre') return { kind: 'custom', page: 'sobre' };
    if (segs[0] === 'projetos') return { kind: 'custom', page: 'projetos' };
    return { kind: 'pagina', slug: segs[0] };
  }
  if (segs.length === 2) {
    if (segs[0] === 'noticias') return { kind: 'noticia', slug: segs[1] };
    if (segs[0] === 'categoria') return { kind: 'categoria', slug: segs[1] };
    if (segs[0] === 'autor') return { kind: 'autor', slug: segs[1] };
    if (segs[0] === 'tag') return { kind: 'tag', tag: decodeURIComponent(segs[1]) };
  }
  return { kind: 'notFound' };
}

const SLUG_RE = /^[a-z0-9-]+$/i;
function validSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

// ─── Fetch com Cache API (TTL herdado do Cache-Control do raw) ──

async function cachedFetch(url: string, wait: WaitUntil): Promise<Response | null> {
  try {
    const cache = caches.default;
    const hit = await cache.match(url);
    if (hit) return hit;
    const res = await fetch(url);
    if (res.ok) {
      const copy = res.clone();
      wait(cache.put(url, copy).catch(() => {}));
    }
    return res;
  } catch {
    return null; // erro de rede — o chamador decide o fallback
  }
}

async function fetchIndex(wait: WaitUntil): Promise<SiteIndex | null> {
  const res = await cachedFetch(`${RAW_BASE}/data/index.json`, wait);
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as SiteIndex;
  } catch {
    return null;
  }
}

type DocResult = { notFound: boolean; data: Record<string, unknown>; body: string };

async function fetchDoc(
  collection: 'noticia' | 'pagina',
  slug: string,
  wait: WaitUntil,
): Promise<DocResult | null> {
  const res = await cachedFetch(`${RAW_BASE}/content/${collection}/${slug}.md`, wait);
  if (!res) return null; // rede indisponível
  if (!res.ok) return { notFound: true, data: {}, body: '' };
  const { data, body } = parseFrontmatter(await res.text());
  return { notFound: false, data, body };
}

// ─── Render: markup idêntico aos componentes React ───────────

const DEFAULT_DESCRIPTION =
  'Mata Viva — Vigilância ambiental e transparência na bacia do Igarapé Água Branca, APA Tarumã, Manaus/AM.';
const HOME_TITLE = 'Mata Viva — Bacia do Igarapé Água Branca';

function metaAsNoticia(m: NoticiaMeta): Noticia {
  return { ...m, corpoHtml: '' };
}

function sortedNoticias(index: SiteIndex): Noticia[] {
  return index.noticias.map(metaAsNoticia).sort((a, b) => b.data.localeCompare(a.data));
}

function catMap(index: SiteIndex): Record<string, Categoria> {
  return Object.fromEntries(index.categorias.map((c) => [c.slug, c]));
}

function newsCardHTML(
  n: Noticia,
  cats: Record<string, Categoria>,
  showExcerpt: boolean,
): string {
  const nome = cats[n.categoria]?.nome;
  const media = n.imagem
    ? `<img class="mv-news-card__img" src="${escapeHtml(n.imagem)}" alt="" aria-hidden="true" loading="lazy">`
    : `<div class="mv-news-card__placeholder" aria-hidden="true"></div>`;
  const badge = nome ? `<span class="mv-news-card__categoria">${escapeHtml(nome)}</span>` : '';
  const excerpt = showExcerpt
    ? `<p class="mv-news-card__excerpt">${escapeHtml(n.resumo)}</p>`
    : '';
  return (
    `<article class="mv-news-card">` +
    `<a href="/noticias/${encodeURIComponent(n.slug)}" class="mv-news-card__link" aria-label="${escapeHtml(n.titulo)}">` +
    `<div class="mv-news-card__media">${media}${badge}</div>` +
    `<div class="mv-news-card__body">` +
    `<time class="mv-news-card__data" datetime="${escapeHtml(n.data)}">${escapeHtml(formatDateShortBR(n.data))}</time>` +
    `<h2 class="mv-news-card__titulo">${escapeHtml(n.titulo)}</h2>` +
    excerpt +
    `</div></a></article>`
  );
}

function newsGridHTML(
  noticias: Noticia[],
  cats: Record<string, Categoria>,
  showExcerpt = false,
): string {
  const items = noticias
    .map(
      (n) =>
        `<div class="mv-news-grid__item" role="listitem">${newsCardHTML(n, cats, showExcerpt)}</div>`,
    )
    .join('');
  return `<div class="mv-news-grid" role="list">${items}</div>`;
}

function heroHTML(n: Noticia, cats: Record<string, Categoria>): string {
  const nome = cats[n.categoria]?.nome;
  const bg = n.imagem
    ? `<img class="mv-hero__img" src="${escapeHtml(n.imagem)}" alt="" aria-hidden="true">`
    : `<div class="mv-hero__placeholder" aria-hidden="true"></div>`;
  const badge = nome ? `<span class="mv-hero__categoria">${escapeHtml(nome)}</span>` : '';
  return (
    `<article class="mv-hero">` +
    `<div class="mv-hero__bg">${bg}</div>` +
    `<div class="mv-hero__overlay"></div>` +
    `<div class="mv-hero__content">` +
    `<div class="mv-hero__header">${badge}<time class="mv-hero__data" datetime="${escapeHtml(n.data)}">${escapeHtml(formatDateBR(n.data))}</time></div>` +
    `<h1 class="mv-hero__titulo"><a href="/noticias/${encodeURIComponent(n.slug)}" class="mv-hero__link">${escapeHtml(n.titulo)}</a></h1>` +
    `<p class="mv-hero__resumo">${escapeHtml(n.resumo)}</p>` +
    `<a href="/noticias/${encodeURIComponent(n.slug)}" class="mv-hero__cta">Ler notícia</a>` +
    `</div></article>`
  );
}

function categorySectionHTML(
  cat: Categoria,
  noticias: Noticia[],
  cats: Record<string, Categoria>,
): string {
  const desc = cat.descricao
    ? `<p class="mv-category-section__descricao">${escapeHtml(cat.descricao)}</p>`
    : '';
  return (
    `<section class="mv-category-section">` +
    `<header class="mv-category-section__header">` +
    `<div><h2 class="mv-category-section__nome">${escapeHtml(cat.nome)}</h2>${desc}</div>` +
    `<a href="/categoria/${encodeURIComponent(cat.slug)}" class="mv-category-section__link">Ver todas</a>` +
    `</header>` +
    newsGridHTML(noticias, cats, true) +
    `</section>`
  );
}

function categoryHeaderHTML(cat: Categoria): string {
  const desc = cat.descricao
    ? `<p class="mv-category-header__desc">${escapeHtml(cat.descricao)}</p>`
    : '';
  return `<header class="mv-category-header"><h1 class="mv-category-header__title">${escapeHtml(cat.nome)}</h1>${desc}</header>`;
}

function authorCardHTML(a: Autor): string {
  const initials = a.title
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const avatar = a.avatar
    ? `<img class="mv-author-card__img" src="${escapeHtml(a.avatar)}" alt="${escapeHtml(a.title)}">`
    : `<span class="mv-author-card__initials" aria-hidden="true">${escapeHtml(initials)}</span>`;
  const cargo = a.cargo ? `<p class="mv-author-card__cargo">${escapeHtml(a.cargo)}</p>` : '';
  const bio = a.bio ? `<p class="mv-author-card__bio">${escapeHtml(a.bio)}</p>` : '';
  return (
    `<article class="mv-author-card">` +
    `<div class="mv-author-card__avatar">${avatar}</div>` +
    `<div class="mv-author-card__body">` +
    `<h1 class="mv-author-card__name">${escapeHtml(a.title)}</h1>${cargo}${bio}` +
    `</div></article>`
  );
}

function articleHTML(n: Noticia, autor: Autor): string {
  const updated = n.atualizada
    ? `<p class="mv-article-header__updated">Atualizada em <time datetime="${escapeHtml(n.atualizada)}">${escapeHtml(formatDateBR(n.atualizada.slice(0, 10)))}</time></p>`
    : '';
  const tags = n.tags.length
    ? `<ul class="mv-tag-list" aria-label="Tags">${n.tags
        .map(
          (t) =>
            `<li><a class="mv-tag-list__pill" href="/tag/${encodeURIComponent(t)}">${escapeHtml(t)}</a></li>`,
        )
        .join('')}</ul>`
    : '';
  return (
    `<header class="mv-article-header">` +
    `<h1 class="mv-article-header__title">${escapeHtml(n.titulo)}</h1>` +
    `<div class="mv-article-header__meta">` +
    `<p class="mv-article-header__byline">Por <a class="mv-article-header__author-link" href="/autor/${encodeURIComponent(autor.slug)}">${escapeHtml(autor.title)}</a></p>` +
    `<time class="mv-article-header__date" datetime="${escapeHtml(n.data)}">${escapeHtml(formatDateBR(n.data))}</time>` +
    `</div>` +
    updated +
    tags +
    `<hr class="mv-article-header__divider">` +
    `</header>` +
    `<div class="mv-article-body">${n.corpoHtml}</div>`
  );
}

function pageShellHTML(p: Pagina): string {
  const img = p.imagem
    ? `<img class="mv-page-shell__img" src="${escapeHtml(p.imagem)}" alt="${escapeHtml(p.titulo)}">`
    : '';
  const body = p.corpoHtml ? `<div class="mv-page-shell__body">${p.corpoHtml}</div>` : '';
  return (
    `<article class="mv-page-shell">` +
    `<h1 class="mv-page-shell__title">${escapeHtml(p.titulo)}</h1>` +
    img +
    body +
    `</article>`
  );
}

function sobreHTML(): string {
  return (
    `<div class="mv-page-sobre">` +
    `<section class="mv-page-sobre__hero">` +
    `<div class="mv-page-sobre__hero-inner">` +
    `<div class="mv-page-sobre__hero-visual" aria-hidden="true"></div>` +
    `<div class="mv-page-sobre__hero-text">` +
    `<span class="mv-page-sobre__hero-eyebrow">SOBRE NÓS</span>` +
    `<h1 class="mv-page-sobre__hero-title">Conectando Comunidades<br>Pela Preservação Ambiental</h1>` +
    `<p class="mv-page-sobre__hero-desc">Há mais de 22 anos, a Associação Mata Viva reúne moradores, ativistas e pesquisadores na proteção do Igarapé Água Branca, dentro da APA Tarumã, em Manaus/AM. Atuamos com mobilização comunitária, mutirões de limpeza, educação ambiental e monitoramento da qualidade da água — sempre com transparência e participação popular.</p>` +
    `</div></div></section>` +
    `<section class="mv-page-sobre__mvv">` +
    `<div class="mv-page-sobre__mvv-inner">` +
    `<h2 class="mv-page-sobre__mvv-title">Nossa essência</h2>` +
    `<div class="mv-page-sobre__mvv-grid">` +
    mvvCardHTML('Missão', 'Vigiar, preservar e recuperar o Igarapé Água Branca por meio de monitoramento científico, educação ambiental e incidência política.') +
    mvvCardHTML('Visão', 'Ser referência em transparência ambiental e gestão participativa de bacias hidrográficas na Amazônia.') +
    mvvCardHTML('Valores', 'Transparência, autonomia comunitária, ciência cidadã, justiça ambiental e defesa intransigente do direito à água.') +
    `</div></div></section></div>`
  );
}

function mvvCardHTML(titulo: string, desc: string): string {
  return (
    `<article class="mv-page-sobre__mvv-card">` +
    `<div class="mv-page-sobre__mvv-icon" aria-hidden="true"></div>` +
    `<h3 class="mv-page-sobre__mvv-card-title">${escapeHtml(titulo)}</h3>` +
    `<p class="mv-page-sobre__mvv-card-desc">${escapeHtml(desc)}</p>` +
    `</article>`
  );
}

function projetosHTML(): string {
  const metas = [
    'Monitorar a qualidade da água em 5 pontos estratégicos do Igarapé',
    'Publicar boletins mensais com dados abertos e acessíveis à comunidade',
    'Ampliar a rede de voluntários para coleta e análise de amostras',
  ];
  const estrategias = [
    'Mobilização de moradores para mutirões de limpeza nas margens',
    'Oficinas de educação ambiental com escolas da região da APA Tarumã',
    'Campanhas de preservação e conscientização nas redes sociais e na mídia local',
  ];
  const resultados = [
    { n: '1', l: 'Núcleo de monitoramento formado' },
    { n: '2', l: 'Boletins trimestrais publicados' },
    { n: '3', l: 'Mutirões realizados na bacia' },
    { n: '4', l: 'Oficinas com escolas' },
    { n: '5', l: 'Pontos de coleta ativos' },
    { n: '6', l: 'Anos de atuação ininterrupta' },
  ];

  return (
    `<div class="mv-page-projetos">` +
    `<section class="mv-page-projetos__hero">` +
    `<div class="mv-page-projetos__hero-inner">` +
    `<div class="mv-page-projetos__hero-visual" aria-hidden="true"></div>` +
    `<div class="mv-page-projetos__hero-text">` +
    `<span class="mv-page-projetos__hero-eyebrow">PROJETOS</span>` +
    `<h1 class="mv-page-projetos__hero-title">Monitoramento online<br>de Igarapés Urbanos</h1>` +
    `<p class="mv-page-projetos__hero-desc">O projeto de Monitoramento Online de Igarapés Urbanos une ciência cidadã e tecnologia para acompanhar em tempo real a qualidade da água do Igarapé Água Branca. Os dados são públicos e alimentam relatórios, boletins e ações de recuperação ambiental.</p>` +
    `</div></div></section>` +
    `<section class="mv-page-projetos__section">` +
    `<div class="mv-page-projetos__section-inner mv-page-projetos__section--reverse">` +
    `<div class="mv-page-projetos__section-visual" aria-hidden="true"></div>` +
    `<div class="mv-page-projetos__section-text">` +
    `<h2 class="mv-page-projetos__section-title">Metas do monitoramento</h2>` +
    `<ul class="mv-page-projetos__checklist">` +
    metas.map((item) => `<li class="mv-page-projetos__checklist-item"><span class="mv-page-projetos__check-icon" aria-hidden="true"></span><span>${escapeHtml(item)}</span></li>`).join('') +
    `</ul></div></div></section>` +
    `<section class="mv-page-projetos__section mv-page-projetos__section--alt">` +
    `<div class="mv-page-projetos__section-inner">` +
    `<div class="mv-page-projetos__section-visual" aria-hidden="true"></div>` +
    `<div class="mv-page-projetos__section-text">` +
    `<h2 class="mv-page-projetos__section-title">Estratégia de ação</h2>` +
    `<ul class="mv-page-projetos__checklist">` +
    estrategias.map((item) => `<li class="mv-page-projetos__checklist-item"><span class="mv-page-projetos__check-icon" aria-hidden="true"></span><span>${escapeHtml(item)}</span></li>`).join('') +
    `</ul></div></div></section>` +
    `<section class="mv-page-projetos__resultados">` +
    `<div class="mv-page-projetos__resultados-inner">` +
    `<h2 class="mv-page-projetos__resultados-title">Nossos Resultados</h2>` +
    `<div class="mv-page-projetos__resultados-grid">` +
    resultados.map((r) => (
      `<div class="mv-page-projetos__resultado">` +
      `<span class="mv-page-projetos__resultado-marker">${escapeHtml(r.n)}</span>` +
      `<p class="mv-page-projetos__resultado-label">${escapeHtml(r.l)}</p></div>`
    )).join('') +
    `</div></div></section></div>`
  );
}

function notFoundHTML(): string {
  return (
    `<section class="mv-page-section">` +
    `<h1 class="mv-page-title">Página não encontrada</h1>` +
    `<p class="mv-content-error">O conteúdo que você procura não existe ou foi movido.</p>` +
    `<p><a class="mv-back-link" href="/">Voltar para a página inicial</a></p>` +
    `</section>`
  );
}

// ─── Views por rota (espelham o ContentView do ContentApp) ───

function oQueFazemosHTML(): string {
  return (
    `<section class="mv-oquefazemos">` +
    `<div class="mv-oquefazemos__inner">` +
    `<h2 class="mv-oquefazemos__title">O que fazemos?</h2>` +
    `<div class="mv-oquefazemos__grid">` +
    cardOQF('Plantio de Mudas Nativas', 'Promovemos o reflorestamento da mata ciliar do Igarapé Água Branca com espécies nativas da Amazônia, recuperando nascentes e protegendo a biodiversidade.') +
    cardOQF('Projeto Trilha Ecológica', 'Educação ambiental na prática: trilhas monitoradas que conectam a comunidade ao ecossistema local, com identificação de fauna e flora.') +
    cardOQF('Monitoramento Online', 'Dados abertos e transparência: análises da qualidade da água, imagens de satélite e boletins ambientais acessíveis a todos.') +
    `</div></div></section>`
  );
}

function cardOQF(titulo: string, desc: string): string {
  return (
    `<article class="mv-oquefazemos__card">` +
    `<span class="mv-oquefazemos__icon" aria-hidden="true"></span>` +
    `<h3 class="mv-oquefazemos__card-title">${escapeHtml(titulo)}</h3>` +
    `<p class="mv-oquefazemos__card-desc">${escapeHtml(desc)}</p>` +
    `</article>`
  );
}

function missaoVisaoValoresHTML(): string {
  const cards = [
    { t: 'Missão', d: 'Vigiar, preservar e recuperar o Igarapé Água Branca por meio de monitoramento científico, educação ambiental e incidência política.' },
    { t: 'Visão', d: 'Ser referência em transparência ambiental e gestão participativa de bacias hidrográficas na Amazônia.' },
    { t: 'Valores', d: 'Transparência, autonomia comunitária, ciência cidadã, justiça ambiental e defesa intransigente do direito à água.' },
  ];
  const items = cards.map((c) =>
    `<article class="mv-mvv__card">` +
    `<h3 class="mv-mvv__card-title">${escapeHtml(c.t)}</h3>` +
    `<p class="mv-mvv__card-desc">${escapeHtml(c.d)}</p>` +
    `</article>`
  ).join('');
  return (
    `<section class="mv-mvv"><div class="mv-mvv__inner"><div class="mv-mvv__grid">${items}</div></div></section>`
  );
}

function fraseDestaqueHTML(): string {
  return (
    `<section class="mv-frase"><div class="mv-frase__inner">` +
    `<blockquote class="mv-frase__quote"><p class="mv-frase__text">&ldquo;Lutamos diariamente pela preservação ambiental com transparência e participação comunitária.&rdquo;</p></blockquote>` +
    `<p class="mv-frase__by">Mata Viva</p>` +
    `</div></section>`
  );
}

function homeViewHTML(index: SiteIndex): string {
  const noticias = sortedNoticias(index);
  const cats = catMap(index);
  const destaque = noticias.filter((n) => n.destaque)[0] ?? null;
  const recentes = noticias.filter((n) => n.slug !== destaque?.slug).slice(0, 12);
  const sections = index.categorias
    .map((c) => {
      const daCategoria = noticias.filter((n) => n.categoria === c.slug);
      return daCategoria.length > 0 ? categorySectionHTML(c, daCategoria, cats) : '';
    })
    .join('');
  return (
    (destaque ? heroHTML(destaque, cats) : '') +
    oQueFazemosHTML() +
    missaoVisaoValoresHTML() +
    `<section class="mv-page-section">` +
    `<h2 class="mv-page-section__title">Últimas notícias</h2>` +
    newsGridHTML(recentes, cats, true) +
    `</section>` +
    fraseDestaqueHTML() +
    sections
  );
}

function noticiasViewHTML(index: SiteIndex): string {
  return (
    `<section class="mv-page-section">` +
    `<h1 class="mv-page-title">Notícias</h1>` +
    newsGridHTML(sortedNoticias(index), catMap(index), false) +
    `</section>`
  );
}

function categoriaViewHTML(index: SiteIndex, slug: string): string | null {
  const categoria = index.categorias.find((c) => c.slug === slug);
  if (!categoria) return null;
  const daCategoria = sortedNoticias(index).filter((n) => n.categoria === slug);
  return categoryHeaderHTML(categoria) + newsGridHTML(daCategoria, catMap(index), false);
}

function autorViewHTML(index: SiteIndex, slug: string): string | null {
  const autor = index.autores.find((a) => a.slug === slug);
  if (!autor) return null;
  const doAutor = sortedNoticias(index).filter((n) => n.autor === slug);
  const grid = doAutor.length
    ? `<section class="mv-page-section"><h2 class="mv-page-section__title">Notícias</h2>${newsGridHTML(doAutor, catMap(index), false)}</section>`
    : '';
  return authorCardHTML(autor) + grid;
}

function tagViewHTML(index: SiteIndex, tag: string): string {
  const tagCategoria: Categoria = { slug: tag, nome: `#${tag}` };
  const daTag = sortedNoticias(index).filter((n) => n.tags.includes(tag));
  return categoryHeaderHTML(tagCategoria) + newsGridHTML(daTag, catMap(index), false);
}

// ─── Injeção no shell único ──────────────────────────────────

/**
 * Substitui <title> e meta description e injeta o conteúdo renderizado
 * DENTRO do <astro-island> do ContentApp. O React, ao hidratar
 * (client:only), substitui esse conteúdo pela renderização client —
 * crawlers veem o HTML completo; o navegador mantém a experiência SPA.
 */
function injectIntoShell(shell: string, title: string, description: string, content: string): string {
  let html = shell;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${escapeHtml(description)}$2`,
  );
  const marker = 'component-url="/_astro/ContentApp.';
  const idx = html.indexOf(marker);
  if (idx !== -1) {
    const gt = html.indexOf('>', idx);
    if (gt !== -1) {
      html = html.slice(0, gt + 1) + content + html.slice(gt + 1);
    }
  }
  return html;
}

// ─── Entrada principal ───────────────────────────────────────

export interface PrerenderResult {
  status: number;
  html: string;
}

const LISTING_DESCRIPTION =
  'Notícias sobre preservação ambiental e transparência na bacia do Igarapé Água Branca — Mata Viva, Manaus/AM.';

function shellWith(shell: string, title: string, description: string, content: string): PrerenderResult {
  return { status: 200, html: injectIntoShell(shell, title, description, content) };
}

function shellNotFound(shell: string): PrerenderResult {
  return {
    status: 404,
    html: injectIntoShell(shell, 'Página não encontrada — Mata Viva', DEFAULT_DESCRIPTION, notFoundHTML()),
  };
}

function shellFallback(shell: string): PrerenderResult {
  // Rede indisponível: serve o shell puro — o ContentApp client cuida
  // do erro/loading. Nunca quebrar a página por causa do upstream.
  return { status: 200, html: shell };
}

export async function prerenderContent(
  pathname: string,
  shell: string,
  wait: WaitUntil,
): Promise<PrerenderResult> {
  const route = parseRoute(pathname);

  switch (route.kind) {
    case 'home': {
      const index = await fetchIndex(wait);
      if (!index) return shellFallback(shell);
      return shellWith(shell, HOME_TITLE, DEFAULT_DESCRIPTION, homeViewHTML(index));
    }

    case 'noticias': {
      const index = await fetchIndex(wait);
      if (!index) return shellFallback(shell);
      return shellWith(shell, 'Notícias — Mata Viva', LISTING_DESCRIPTION, noticiasViewHTML(index));
    }

    case 'noticia': {
      if (!validSlug(route.slug)) return shellNotFound(shell);
      const [index, doc] = await Promise.all([fetchIndex(wait), fetchDoc('noticia', route.slug, wait)]);
      if (!doc) return shellFallback(shell);
      if (doc.notFound) return shellNotFound(shell);
      const noticia = noticiaFromFrontmatter(route.slug, doc.data, doc.body);
      const autor: Autor =
        index?.autores.find((a) => a.slug === noticia.autor) ??
        { slug: noticia.autor, title: noticia.autor };
      const description = noticia.resumo || DEFAULT_DESCRIPTION;
      return shellWith(shell, `${noticia.titulo} — Mata Viva`, description, articleHTML(noticia, autor));
    }

    case 'categoria': {
      const index = await fetchIndex(wait);
      if (!index) return shellFallback(shell);
      const content = categoriaViewHTML(index, route.slug);
      if (content === null) return shellNotFound(shell);
      const categoria = index.categorias.find((c) => c.slug === route.slug)!;
      const description = categoria.descricao || DEFAULT_DESCRIPTION;
      return shellWith(shell, `${categoria.nome} — Mata Viva`, description, content);
    }

    case 'autor': {
      const index = await fetchIndex(wait);
      if (!index) return shellFallback(shell);
      const content = autorViewHTML(index, route.slug);
      if (content === null) return shellNotFound(shell);
      const autor = index.autores.find((a) => a.slug === route.slug)!;
      const description = autor.bio || DEFAULT_DESCRIPTION;
      return shellWith(shell, `${autor.title} — Mata Viva`, description, content);
    }

    case 'tag': {
      const index = await fetchIndex(wait);
      if (!index) return shellFallback(shell);
      return shellWith(shell, `#${route.tag} — Mata Viva`, LISTING_DESCRIPTION, tagViewHTML(index, route.tag));
    }

    case 'pagina': {
      if (!validSlug(route.slug)) return shellNotFound(shell);
      const doc = await fetchDoc('pagina', route.slug, wait);
      if (!doc) return shellFallback(shell);
      if (doc.notFound) return shellNotFound(shell);
      const pagina = paginaFromFrontmatter(route.slug, doc.data, doc.body);
      return shellWith(shell, `${pagina.titulo} — Mata Viva`, DEFAULT_DESCRIPTION, pageShellHTML(pagina));
    }

    case 'custom': {
      if (route.page === 'sobre') return shellWith(shell, 'Sobre Nós — Mata Viva', DEFAULT_DESCRIPTION, sobreHTML());
      if (route.page === 'projetos') return shellWith(shell, 'Projetos — Mata Viva', DEFAULT_DESCRIPTION, projetosHTML());
      return shellNotFound(shell);
    }

    case 'notFound':
      return shellNotFound(shell);
  }
}
