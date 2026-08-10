// Shared data contract — espelha as coleções de conteúdo do portal
// (categoria, autor, pagina, noticia) para componentes e fixtures
// continuarem tipados e consistentes com o schema do backend.

export type Slug = string; // lowercase, kebab-case; also the markdown filename

export interface Categoria {
  slug: Slug;
  nome: string;
  descricao?: string;
  imagem?: string;
}

export interface Autor {
  slug: Slug;
  title: string;
  cargo?: string;
  bio?: string;
  avatar?: string;
}

export interface Pagina {
  slug: Slug;
  titulo: string;
  imagem?: string;
  corpoHtml: string;
}

export interface Noticia {
  slug: Slug;
  titulo: string;
  data: string; // ISO date (YYYY-MM-DD)
  atualizada?: string; // ISO datetime, only when updated
  categoria: Slug; // references Categoria.slug
  autor: Slug; // references Autor.slug
  tags: string[]; // free-form, lowercase
  destaque: boolean;
  imagem?: string; // media path, may be absolute /images/...
  resumo: string;
  corpoHtml: string; // markdown pre-rendered to HTML by the backend
}

// Small shared prop shapes
export interface NavLink {
  label: string;
  href: string;
}
