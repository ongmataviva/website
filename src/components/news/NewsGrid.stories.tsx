import type { Meta, StoryObj } from '@storybook/react';
import { NewsGrid } from './NewsGrid';
import { noticias, categoriasPorSlug } from '../fixtures';

const meta: Meta<typeof NewsGrid> = {
  title: 'Mata Viva/News/NewsGrid',
  component: NewsGrid,
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

type Story = StoryObj<typeof NewsGrid>;

export const Default: Story = {
  args: {
    noticias,
    showExcerpt: true,
    categoriasPorSlug,
  },
};