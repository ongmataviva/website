import type { Meta, StoryObj } from '@storybook/react';
import { ArticleHeader } from './ArticleHeader';
import { noticias, autores } from '../fixtures';

const meta: Meta<typeof ArticleHeader> = {
  title: 'Mata Viva/News/ArticleHeader',
  component: ArticleHeader,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof ArticleHeader>;

export const Default: Story = {
  args: {
    noticia: noticias[0],
    autor: autores[0],
  },
};

export const ComAtualizacao: Story = {
  args: {
    noticia: {
      ...noticias[0],
      atualizada: '2026-08-01T10:00:00',
    },
    autor: autores[0],
  },
};