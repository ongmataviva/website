import type { Categoria, Noticia } from '../types';
import { NewsGrid } from './NewsGrid';
import './CategorySection.css';

export interface CategorySectionProps {
  categoria: Categoria;
  noticias: Noticia[];
  /** Lookup para resolver slug da categoria em nome exibível nos cards. */
  categoriasPorSlug?: Record<string, Categoria>;
}

/**
 * Seção de notícias por categoria. Exibe cabeçalho com nome e descrição
 * da categoria, uma grade de notícias e um link "Ver todas".
 */
export function CategorySection({
  categoria,
  noticias,
  categoriasPorSlug,
}: CategorySectionProps) {
  return (
    <section className="mv-category-section">
      <header className="mv-category-section__header">
        <div>
          <h2 className="mv-category-section__nome">{categoria.nome}</h2>
          {categoria.descricao && (
            <p className="mv-category-section__descricao">
              {categoria.descricao}
            </p>
          )}
        </div>
        <a
          href={`/categoria/${categoria.slug}`}
          className="mv-category-section__link"
        >
          Ver todas
        </a>
      </header>
      <NewsGrid
        noticias={noticias}
        showExcerpt
        categoriasPorSlug={categoriasPorSlug}
      />
    </section>
  );
}

export default CategorySection;