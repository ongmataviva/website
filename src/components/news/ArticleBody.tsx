import './ArticleBody.css';

export interface ArticleBodyProps {
  html: string;
}

/**
 * Renderiza o corpo HTML pré-compilado de uma notícia.
 * O HTML é gerado pelo backend a partir de Markdown — confiável e seguro
 * para uso com dangerouslySetInnerHTML.
 */
export function ArticleBody({ html }: ArticleBodyProps) {
  return (
    <div
      className="mv-article-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default ArticleBody;