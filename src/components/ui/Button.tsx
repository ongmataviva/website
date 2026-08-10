import type { ReactNode } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps {
  children: ReactNode;
  /** Quando presente, renderiza um <a>; caso contrário, um <button>. */
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit';
  onClick?: () => void;
  className?: string;
}

/**
 * Botão editorial. Primário usa o verde amazônico (--btn-bg/--btn-ink);
 * fantasma é transparente com borda de linha forte. Transições seguem
 * as regras Ocelot (dur-base, ease-out, active:scale, focus-ring).
 */
export function Button({
  children,
  href,
  variant = 'primary',
  size = 'md',
  type = 'button',
  onClick,
  className,
}: ButtonProps) {
  const classes = [
    'mv-btn',
    `mv-btn--${variant}`,
    `mv-btn--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick}>
      {children}
    </button>
  );
}

export default Button;
