/* ============================================================
   Metadados por entidade do Painel (news website)
   Cada entidade mapeia uma collection do config.yml e define
   como o Painel a apresenta (tela otimizada por entidade).
   ============================================================ */

export const COLLECTION_ORDER = ['noticia', 'categoria', 'autor', 'pagina'];

export const ENTITIES = {
  noticia: {
    label: 'Notícias',
    singular: 'notícia',
    newLabel: 'Nova notícia',
    description: 'Artigos e reportagens publicados no site.',
  },
  categoria: {
    label: 'Categorias',
    singular: 'categoria',
    newLabel: 'Nova categoria',
    description: 'Seções que organizam as notícias.',
  },
  autor: {
    label: 'Autores',
    singular: 'autor',
    newLabel: 'Novo autor',
    description: 'Assinaturas das notícias.',
  },
  pagina: {
    label: 'Páginas',
    singular: 'página',
    newLabel: 'Nova página',
    description: 'Páginas institucionais estáticas.',
  },
};

export function entityMeta(collectionName) {
  return ENTITIES[collectionName] || {
    label: collectionName,
    singular: collectionName,
    newLabel: `Novo ${collectionName}`,
    description: '',
  };
}

/** Rótulo em pt-BR para campos conhecidos; fallback: nome do campo. */
export const FIELD_LABELS = {
  titulo: 'Título',
  slug: 'Slug',
  data: 'Data de publicação',
  atualizada: 'Atualizada em',
  categoria: 'Categoria',
  autor: 'Autor',
  tags: 'Tags',
  destaque: 'Destaque na capa',
  imagem: 'Imagem de capa',
  resumo: 'Resumo',
  body: 'Conteúdo',
  nome: 'Nome',
  descricao: 'Descrição',
  title: 'Nome',
  cargo: 'Cargo',
  login: 'Login GitHub',
  bio: 'Biografia',
  avatar: 'Foto',
};

export function fieldLabel(field) {
  return FIELD_LABELS[field.name] || field.label || field.name;
}
