import type { ReactNode } from 'react';
import './Badge.css';

export type BadgeVariant = 'neutral' | 'accent' | 'open' | 'progress' | 'resolved';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

/**
 * Rótulo de status em formato de pílula. Variantes mapeiam diretamente
 * os tokens de cor da marca (--color-accent-*) e de status
 * (--color-status-*). Usado em listas de notícias e ocorrências.
 */
export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return <span className={`mv-badge mv-badge--${variant}`}>{children}</span>;
}

export default Badge;
