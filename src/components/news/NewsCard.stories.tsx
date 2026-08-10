import type { Meta, StoryObj } from '@storybook/react';
import { NewsCard } from './NewsCard';
import { noticias, categoriasPorSlug } from '../fixtures';

const meta: Meta<typeof NewsCard> = {
  title: 'Mata Viva/News/NewsCard',
  component: NewsCard,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof NewsCard>;

export const Default: Story = {
  args: {
    noticia: noticias[0],
    showExcerpt: true,
    categoriasPorSlug,
  },
};

export const Compact: Story = {
  args: {
    noticia: noticias[0],
    showExcerpt: false,
    categoriasPorSlug,
  },
};