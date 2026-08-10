import type { Meta, StoryObj } from '@storybook/react';
import { CategorySection } from './CategorySection';
import { categorias, noticias, categoriasPorSlug } from '../fixtures';

const meta: Meta<typeof CategorySection> = {
  title: 'Mata Viva/News/CategorySection',
  component: CategorySection,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ padding: 'var(--space-8)', maxWidth: 'var(--max-width-page)', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof CategorySection>;

const categoria = categorias[0];
const noticiasDaCategoria = noticias.filter(
  (n) => n.categoria === categoria.slug,
);

export const Default: Story = {
  args: {
    categoria,
    noticias: noticiasDaCategoria,
    categoriasPorSlug,
  },
};