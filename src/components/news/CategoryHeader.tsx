import type { Categoria } from '../types';
import './CategoryHeader.css';

export interface CategoryHeaderProps {
  categoria: Categoria;
}

/**
 * Cabeçalho de página de categoria — título e descrição centralizados.
 */
export function CategoryHeader({ categoria }: CategoryHeaderProps) {
  return (
    <header className="mv-category-header">
      <h1 className="mv-category-header__title">{categoria.nome}</h1>
      {categoria.descricao && (
        <p className="mv-category-header__desc">{categoria.descricao}</p>
      )}
    </header>
  );
}

export default CategoryHeader;