import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Mata Viva/UI/Button',
  component: Button,
  parameters: { layout: 'centered' },
  args: {
    children: 'Ver ocorrências',
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'md',
  },
};

export const Pequeno: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    children: 'Filtrar',
  },
};

export const ComoLink: Story = {
  args: {
    href: '/ocorrencias',
    variant: 'ghost',
    children: 'Abrir mapa de ocorrências',
  },
};
