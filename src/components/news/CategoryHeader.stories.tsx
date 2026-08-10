import type { Meta, StoryObj } from '@storybook/react';
import { CategoryHeader } from './CategoryHeader';
import { categorias } from '../fixtures';

const meta: Meta<typeof CategoryHeader> = {
  title: 'Mata Viva/News/CategoryHeader',
  component: CategoryHeader,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof CategoryHeader>;

export const Default: Story = {
  args: {
    categoria: categorias[0],
  },
};

export const AguaSaneamento: Story = {
  args: {
    categoria: categorias[1],
  },
};

export const SemDescricao: Story = {
  args: {
    categoria: { slug: 'sem-descricao', nome: 'Sem Descrição' },
  },
};