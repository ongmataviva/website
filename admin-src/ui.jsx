import { forwardRef } from 'react';

/* ============================================================
   Primitivos de UI do Painel (estética Ocelot)
   Todas as classes em public/admin/painel.css.
   ============================================================ */

const cx = (...parts) => parts.filter(Boolean).join(' ');

export function Button({ variant = 'default', size, className, ...rest }) {
  const classes = cx(
    'pnl-btn',
    variant === 'primary' && 'pnl-btn--primary',
    variant === 'ghost' && 'pnl-btn--ghost',
    variant === 'danger' && 'pnl-btn--danger',
    variant === 'danger-solid' && 'pnl-btn--danger-solid',
    size === 'sm' && 'pnl-btn--sm',
    size === 'lg' && 'pnl-btn--lg',
    className,
  );
  return <button className={classes} {...rest} />;
}

export const Input = forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx('pnl-input', className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx('pnl-textarea', className)} {...rest} />;
});

export const Select = forwardRef(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx('pnl-select', className)} {...rest}>
      {children}
    </select>
  );
});

export function Field({ label, hint, required, className, children, htmlFor }) {
  return (
    <div className={cx('pnl-field', className)}>
      {label ? (
        <label className="pnl-label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="pnl-req"> *</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? <span className="pnl-hint">{hint}</span> : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="pnl-toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="pnl-toggle-track" aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </label>
  );
}

export function Badge({ children, variant = 'default', className }) {
  const classes = cx(
    'pnl-badge',
    variant === 'accent' && 'pnl-badge--accent',
    variant === 'outline' && 'pnl-badge--outline',
    variant === 'featured' && 'pnl-badge--featured',
    className,
  );
  return <span className={classes}>{children}</span>;
}

export function Spinner({ large }) {
  return <span className={cx('pnl-spinner', large && 'pnl-spinner--lg')} aria-label="Carregando" />;
}

export function LoadingScreen({ message = 'Carregando…' }) {
  return (
    <div className="pnl-center" style={{ minHeight: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Spinner large />
        <span className="pnl-hint">{message}</span>
      </div>
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="pnl-empty">
      <p className="pnl-empty-title">{title}</p>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function Card({ className, children }) {
  return <div className={cx('pnl-card', className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="pnl-header">
      <div>
        <h1 className="pnl-title">{title}</h1>
        {subtitle ? <p className="pnl-subtitle">{subtitle}</p> : null}
      </div>
      {children ? <div className="pnl-header-actions">{children}</div> : null}
    </header>
  );
}

export function Forbidden({ title = 'Sem permissão', message }) {
  return (
    <div className="pnl-center" style={{ minHeight: '60vh' }}>
      <div className="pnl-card pnl-login-card">
        <h1 className="pnl-title">{title}</h1>
        <p className="pnl-hint">{message || 'Somente administradores podem executar esta ação.'}</p>
        <Button variant="primary" onClick={() => history.back()}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
