import { Field, Toggle } from './ui';
import { fieldLabel } from './entities';
import ImageField from './image-field';
import MarkdownEditor from './mdx-editor';

/* ============================================================
   Componentes de campo reutilizáveis (rótulos pt-BR via
   entities.js). Cada um liga o valor do rascunho a um campo.
   ============================================================ */

function fieldMeta(field) {
  return { label: fieldLabel(field), hint: field.hint, required: field.required };
}

export function TextField({ field, value, onChange, className, placeholder }) {
  return (
    <Field {...fieldMeta(field)} htmlFor={field.name} className={className}>
      <input
        id={field.name}
        className="pnl-input"
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
      />
    </Field>
  );
}

export function SlugField({ field, value, onChange, auto, className }) {
  return (
    <Field
      {...fieldMeta(field)}
      htmlFor={field.name}
      className={className}
      hint={auto ? 'Gerado automaticamente a partir do título.' : undefined}
    >
      <input
        id={field.name}
        className="pnl-input pnl-input--mono"
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ex.: nova-cobertura-na-amazonia"
      />
    </Field>
  );
}

export function TextAreaField({ field, value, onChange, className, rows }) {
  return (
    <Field {...fieldMeta(field)} htmlFor={field.name} className={className}>
      <textarea
        id={field.name}
        className="pnl-textarea"
        rows={rows ?? 5}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function DateField({ field, value, onChange }) {
  const v = value ? String(value).slice(0, 10) : '';
  return (
    <Field {...fieldMeta(field)} htmlFor={field.name}>
      <input
        id={field.name}
        className="pnl-input"
        type="date"
        value={v}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </Field>
  );
}

export function DateTimeField({ field, value, onChange }) {
  const v = value ? String(value).slice(0, 16) : '';
  return (
    <Field {...fieldMeta(field)} htmlFor={field.name}>
      <input
        id={field.name}
        className="pnl-input"
        type="datetime-local"
        value={v}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </Field>
  );
}

export function SelectField({ field, value, onChange, options, emptyLabel, className, disabled, hint }) {
  const meta = fieldMeta(field);
  return (
    <Field {...meta} htmlFor={field.name} className={className} hint={hint ?? meta.hint}>
      <select
        id={field.name}
        className="pnl-select"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{emptyLabel ?? '— selecionar —'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ToggleField({ field, value, onChange }) {
  return (
    <div className="pnl-field">
      <Toggle checked={!!value} onChange={(v) => onChange(v)} label={fieldLabel(field)} />
    </div>
  );
}

export function TagsField({ field, value, onChange, className }) {
  const text = Array.isArray(value) ? value.join(', ') : value ? String(value) : '';
  return (
    <Field {...fieldMeta(field)} htmlFor={field.name} className={className} hint="Separe as tags por vírgula.">
      <input
        id={field.name}
        className="pnl-input"
        type="text"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? [] : raw.split(',').map((s) => s.trim()).filter(Boolean));
        }}
        placeholder="ex.: manaus, meio-ambiente"
      />
    </Field>
  );
}

export function ImageFieldView({ field, value, onChange, className }) {
  return (
    <Field {...fieldMeta(field)} className={className}>
      <ImageField value={value} onChange={onChange} field={field} />
    </Field>
  );
}

export function MarkdownField({ field, value, onChange, className }) {
  return (
    <Field {...fieldMeta(field)} className={className}>
      <MarkdownEditor value={value} onChange={onChange} />
    </Field>
  );
}
