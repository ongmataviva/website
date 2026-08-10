import type { ReactNode } from 'react';
import './Badge.css';

export type BadgeVariant = 'neutral' | 'accent';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

/**
 * Rótulo em formato de pílula. As variantes mapeiam diretamente os tokens
 * de cor da marca (--color-accent-*) e do neutro (--color-surface-muted).
 */
export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return <span className={`mv-badge mv-badge--${variant}`}>{children}</span>;
}

export default Badge;
