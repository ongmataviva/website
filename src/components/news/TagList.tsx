import './TagList.css';

export interface TagListProps {
  tags: string[];
  baseHref?: string;
}

/**
 * Lista de tags em formato de pílulas com link para a página de cada tag.
 */
export function TagList({ tags, baseHref = '/tag/' }: TagListProps) {
  if (tags.length === 0) return null;

  return (
    <ul className="mv-tag-list" aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag}>
          <a className="mv-tag-list__pill" href={`${baseHref}${tag}`}>
            {tag}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default TagList;