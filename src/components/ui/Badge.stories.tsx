import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';
import type { BadgeProps } from './Badge';

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
