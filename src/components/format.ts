// Shared formatting helpers — PT-BR editorial conventions.

/**
 * Format an ISO date (YYYY-MM-DD) as long PT-BR date:
 * "5 de agosto de 2026". Midday is used to avoid timezone drift.
 */
export function formatDateBR(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Short PT-BR date: "5 de ago." — used in cards/compact meta.
 */
export function formatDateShortBR(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/**
 * Format an ISO datetime (YYYY-MM-DDTHH:mm) as PT-BR:
 * "5 de agosto de 2026, 14h30".
 */
export function formatDateTimeBR(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return isoDateTime;
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/**
 * Turn a kebab-case slug into a readable label (no accent inference):
 * "igarape-agua-branca" -> "Igarape Agua Branca".
 */
export function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
