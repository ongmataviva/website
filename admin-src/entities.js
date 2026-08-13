/* ============================================================
   Metadados por entidade do Painel (news website)
   Cada entidade mapeia uma collection do config.yml e define
   como o Painel a apresenta (tela otimizada por entidade).
   ============================================================ */

export const COLLECTION_ORDER = ['noticia', 'categoria', 'autor', 'pagina', 'doacao', 'parceiro'];

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
  doacao: {
    label: 'Doação',
    singular: 'doação',
    newLabel: 'Editar dados de doação',
    description: 'Chave PIX e dados bancários. Item único.',
  },
  parceiro: {
    label: 'Parceiros',
    singular: 'parceiro',
    newLabel: 'Novo parceiro',
    description: 'Logotipos e links de parceiros e apoiadores.',
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
  chave_pix: 'Chave PIX',
  titular: 'Titular',
  banco: 'Banco',
  agencia: 'Agência',
  conta: 'Conta',
  tipo_conta: 'Tipo de conta',
  url: 'URL do site',
  logo: 'Logotipo',
};

export function fieldLabel(field) {
  return FIELD_LABELS[field.name] || field.label || field.name;
}
