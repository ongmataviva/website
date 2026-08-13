// ContentApp — router client das páginas de conteúdo (Opção C).
// O build gera apenas o esqueleto; qualquer rota de conteúdo (/, /noticias,
// /noticias/[slug], /categoria/[slug], /autor/[slug], /tag/[tag], /doar,
// /busca e páginas institucionais /[slug]) é servida pelo Worker com o mesmo
// shell e este componente decide o que renderizar com base no pathname:
//   - listagens: data/index.json via raw.githubusercontent
//   - artigos/páginas: .md individual via raw.githubusercontent
//   - doacao: singletons via raw.githubusercontent
import { useEffect, useMemo, useState } from 'react';
import type { Autor, Categoria, Doacao, Noticia, Pagina, Parceiro } from '../types';
import HeroSpotlight from '../news/HeroSpotlight';
import NewsGrid from '../news/NewsGrid';
import CategorySection from '../news/CategorySection';
import CategoryHeader from '../news/CategoryHeader';
import AuthorCard from '../news/AuthorCard';
import ArticleHeader from '../news/ArticleHeader';
import ArticleBody from '../news/ArticleBody';
import PageShell from '../PageShell';
import OQueFazemos from '../news/OQueFazemos';
import MissaoVisaoValores from '../news/MissaoVisaoValores';
import FraseDestaque from '../news/FraseDestaque';
import DoacaoSection from '../news/DoacaoSection';
import ParceirosGrid from '../news/ParceirosGrid';
import { Sobre } from '../pages/Sobre';
import { Projetos } from '../pages/Projetos';
import {
  fetchIndex,
  fetchDoacao,
  fetchParceiros,
  fetchMarkdown,
  noticiaFromFrontmatter,
  paginaFromFrontmatter,
  metaAsNoticia,
  buildCategoriasPorSlug,
  buildAutoresPorSlug,
  ordemDataDesc,
  type SiteIndex,
} from '../../lib/remote';
import './ContentApp.css';

type Route =
  | { kind: 'home' }
  | { kind: 'noticias' }
  | { kind: 'noticia'; slug: string }
  | { kind: 'categoria'; slug: string }
  | { kind: 'autor'; slug: string }
  | { kind: 'tag'; tag: string }
  | { kind: 'pagina'; slug: string }
  | { kind: 'custom'; page: 'sobre' | 'projetos' }
  | { kind: 'notFound' };

function parseRoute(pathname: string): Route {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return { kind: 'home' };
  if (segs.length === 1) {
    if (segs[0] === 'noticias') return { kind: 'noticias' };
    if (segs[0] === 'doar' || segs[0] === 'doacao') return { kind: 'pagina', slug: 'doar' };
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

const HOME_TITLE = 'Mata Viva — Bacia do Igarapé Água Branca';

function setNavActive(pathname: string) {
  const segs = pathname.split('/').filter(Boolean);
  const match = segs[0] === 'noticias' ? '/noticias' : '/';
  document.querySelectorAll('.mv-nav__link').forEach((el) => {
    const href = el.getAttribute('href');
    const active = href === match;
    el.classList.toggle('mv-nav__link--active', active);
    if (active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}

export function ContentApp() {
  const route = useMemo<Route>(() => parseRoute(window.location.pathname), []);
  const [index, setIndex] = useState<SiteIndex | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    setNavActive(window.location.pathname);
  }, []);

  useEffect(() => {
    let alive = true;
    fetchIndex()
      .then((i) => alive && setIndex(i))
      .catch(() => alive && setErro(true));
    return () => {
      alive = false;
    };
  }, []);

  if (erro) {
    return (
      <p className="mv-content-error">
        Não foi possível carregar o conteúdo. Verifique sua conexão e tente
        novamente.
      </p>
    );
  }
  if (!index) return <div className="mv-content-loading" aria-hidden="true" />;

  return <ContentView route={route} index={index} />;
}

function ContentView({ route, index }: { route: Route; index: SiteIndex }) {
  const categoriasPorSlug = useMemo(
    () => buildCategoriasPorSlug(index.categorias),
    [index],
  );
  const autoresPorSlug = useMemo(
    () => buildAutoresPorSlug(index.autores),
    [index],
  );
  const noticias = useMemo(
    () => index.noticias.map(metaAsNoticia).sort(ordemDataDesc),
    [index],
  );

  // Título do documento para as rotas de listagem.
  useEffect(() => {
    if (route.kind === 'noticias') document.title = 'Notícias — Mata Viva';
    if (route.kind === 'tag') document.title = `#${route.tag} — Mata Viva`;
    if (route.kind === 'categoria') {
      const c = index.categorias.find((x) => x.slug === route.slug);
      if (c) document.title = `${c.nome} — Mata Viva`;
    }
    if (route.kind === 'autor') {
      const a = autoresPorSlug[route.slug];
      if (a) document.title = `${a.title} — Mata Viva`;
    }
    if (route.kind === 'home') document.title = HOME_TITLE;
  }, [route, index, autoresPorSlug]);

  switch (route.kind) {
    case 'home':
      return (
        <HomeView
          noticias={noticias}
          categorias={index.categorias}
          categoriasPorSlug={categoriasPorSlug}
        />
      );
    case 'noticias':
      return (
        <section className="mv-page-section">
          <h1 className="mv-page-title">Notícias</h1>
          <NewsGrid noticias={noticias} categoriasPorSlug={categoriasPorSlug} />
        </section>
      );
    case 'noticia':
      return (
        <ArticleView
          slug={route.slug}
          autoresPorSlug={autoresPorSlug}
        />
      );
    case 'categoria': {
      const categoria = index.categorias.find((c) => c.slug === route.slug);
      if (!categoria) return <NotFoundView />;
      const daCategoria = noticias.filter((n) => n.categoria === route.slug);
      return (
        <>
          <CategoryHeader categoria={categoria} />
          <NewsGrid
            noticias={daCategoria}
            categoriasPorSlug={categoriasPorSlug}
          />
        </>
      );
    }
    case 'autor': {
      const autor = autoresPorSlug[route.slug];
      if (!autor) return <NotFoundView />;
      const doAutor = noticias.filter((n) => n.autor === route.slug);
      return (
        <>
          <AuthorCard autor={autor} />
          {doAutor.length > 0 && (
            <section className="mv-page-section">
              <h2 className="mv-page-section__title">Notícias</h2>
              <NewsGrid
                noticias={doAutor}
                categoriasPorSlug={categoriasPorSlug}
              />
            </section>
          )}
        </>
      );
    }
    case 'tag': {
      const tagCategoria: Categoria = { slug: route.tag, nome: `#${route.tag}` };
      const daTag = noticias.filter((n) => n.tags.includes(route.tag));
      return (
        <>
          <CategoryHeader categoria={tagCategoria} />
          <NewsGrid noticias={daTag} categoriasPorSlug={categoriasPorSlug} />
        </>
      );
    }
    case 'custom': {
      if (route.page === 'sobre') return <Sobre />;
      if (route.page === 'projetos') return <Projetos />;
      return <NotFoundView />;
    }
    case 'pagina':
      return <PageView slug={route.slug} />;
    case 'notFound':
      return <NotFoundView />;
  }
}

// ─── Views ───────────────────────────────────────────────────────────

function HomeView({
  noticias,
  categorias,
  categoriasPorSlug,
}: {
  noticias: Noticia[];
  categorias: Categoria[];
  categoriasPorSlug: Record<string, Categoria>;
}) {
  const [doacao, setDoacao] = useState<Doacao | null>(null);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);

  useEffect(() => {
    fetchDoacao().then(setDoacao).catch(() => {});
    fetchParceiros().then(setParceiros).catch(() => {});
  }, []);

  const destaque =
    noticias.filter((n) => n.destaque).sort(ordemDataDesc)[0] ?? null;
  const recentes = noticias.filter((n) => n.slug !== destaque?.slug).slice(0, 12);

  return (
    <>
      {destaque && (
        <HeroSpotlight noticia={destaque} categoriasPorSlug={categoriasPorSlug} />
      )}

      <OQueFazemos />
      <MissaoVisaoValores />

      <section className="mv-page-section">
        <h2 className="mv-page-section__title">Últimas notícias</h2>
        <NewsGrid
          noticias={recentes}
          showExcerpt
          categoriasPorSlug={categoriasPorSlug}
        />
      </section>

      <FraseDestaque />

      {categorias.map((categoria) => {
        const daCategoria = noticias.filter((n) => n.categoria === categoria.slug);
        return daCategoria.length > 0 ? (
          <CategorySection
            key={categoria.slug}
            categoria={categoria}
            noticias={daCategoria}
            categoriasPorSlug={categoriasPorSlug}
          />
        ) : null;
      })}

      {parceiros.length > 0 && <ParceirosGrid parceiros={parceiros} />}
      {doacao && <DoacaoSection doacao={doacao} />}
    </>
  );
}

function ArticleView({
  slug,
  autoresPorSlug,
}: {
  slug: string;
  autoresPorSlug: Record<string, Autor>;
}) {
  const [noticia, setNoticia] = useState<Noticia | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let alive = true;
    setNoticia(null);
    setErro(false);
    fetchMarkdown('noticia', slug)
      .then(({ data, body }) =>
        alive && setNoticia(noticiaFromFrontmatter(slug, data, body)),
      )
      .catch(() => alive && setErro(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (noticia) document.title = `${noticia.titulo} — Mata Viva`;
  }, [noticia]);

  if (erro) return <NotFoundView />;
  if (!noticia) return <div className="mv-content-loading" aria-hidden="true" />;

  const autor: Autor =
    autoresPorSlug[noticia.autor] ?? { slug: noticia.autor, title: noticia.autor };
  return (
    <>
      <ArticleHeader noticia={noticia} autor={autor} />
      <ArticleBody html={noticia.corpoHtml} />
    </>
  );
}

function PageView({ slug }: { slug: string }) {
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let alive = true;
    setPagina(null);
    setErro(false);
    fetchMarkdown('pagina', slug)
      .then(({ data, body }) =>
        alive && setPagina(paginaFromFrontmatter(slug, data, body)),
      )
      .catch(() => alive && setErro(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (pagina) document.title = `${pagina.titulo} — Mata Viva`;
  }, [pagina]);

  if (erro) return <NotFoundView />;
  if (!pagina) return <div className="mv-content-loading" aria-hidden="true" />;
  return <PageShell pagina={pagina} />;
}

function NotFoundView() {
  return (
    <section className="mv-page-section">
      <h1 className="mv-page-title">Página não encontrada</h1>
      <p className="mv-content-error">
        O conteúdo que você procura não existe ou foi movido.
      </p>
      <p>
        <a className="mv-back-link" href="/">
          Voltar para a página inicial
        </a>
      </p>
    </section>
  );
}

export default ContentApp;