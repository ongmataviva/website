import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';
import type { BadgeProps } from './Badge';
import { ocorrencias } from '../fixtures';
import type { OcorrenciaStatus } from '../types';

const meta: Meta<typeof Badge> = {
  title: 'Mata Viva/UI/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Badge>;

const variants: { variant: BadgeProps['variant']; label: string }[] = [
  { variant: 'neutral', label: 'Neutro' },
  { variant: 'accent', label: 'Destaque' },
  { variant: 'open', label: 'Aberta' },
  { variant: 'progress', label: 'Em andamento' },
  { variant: 'resolved', label: 'Resolvida' },
];

export const Default: Story = {
  args: {
    children: 'Neutro',
    variant: 'neutral',
  },
};

export const Variantes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-6)',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {variants.map((v) => (
        <Badge key={v.variant} variant={v.variant}>
          {v.label}
        </Badge>
      ))}
    </div>
  ),
};

/** Mapeia os status reais do fixture de ocorrências para as variantes. */
export const StatusOcorrencias: Story = {
  render: () => {
    const statusParaVariant: Record<OcorrenciaStatus, BadgeProps['variant']> = {
      Aberta: 'open',
      'Em andamento': 'progress',
      Resolvida: 'resolved',
    };
    const statuses = Array.from(new Set(ocorrencias.map((o) => o.status)));
    return (
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-6)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {statuses.map((status) => (
          <Badge key={status} variant={statusParaVariant[status]}>
            {status}
          </Badge>
        ))}
      </div>
    );
  },
};
