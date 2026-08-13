/**
 * ParceirosGrid — grade de logotipos de parceiros.
 * Dados da coleção "parceiro" (admin).
 */
import type { Parceiro } from '../types';
import './ParceirosGrid.css';

export interface ParceirosGridProps {
  parceiros: Parceiro[];
}

export function ParceirosGrid({ parceiros }: ParceirosGridProps) {
  if (parceiros.length === 0) return null;
  return (
    <section className="mv-parceiros">
      <div className="mv-parceiros__inner">
        <h2 className="mv-parceiros__title">Parceiros e apoiadores</h2>
        <div className="mv-parceiros__grid">
          {parceiros.map((p) => (
            <a
              key={p.slug}
              href={p.url || '#'}
              className="mv-parceiros__card"
              target={p.url ? '_blank' : undefined}
              rel={p.url ? 'noopener noreferrer' : undefined}
              aria-label={p.title}
            >
              {p.logo ? (
                <img
                  src={p.logo}
                  alt={p.title}
                  className="mv-parceiros__logo"
                  loading="lazy"
                />
              ) : (
                <span className="mv-parceiros__name">{p.title}</span>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ParceirosGrid;