import type { Meta, StoryObj } from '@storybook/react';
import { HeroSpotlight } from './HeroSpotlight';
import { noticiaDestaque, categoriasPorSlug } from '../fixtures';

const meta: Meta<typeof HeroSpotlight> = {
  title: 'Mata Viva/News/HeroSpotlight',
  component: HeroSpotlight,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof HeroSpotlight>;

export const Default: Story = {
  args: {
    noticia: noticiaDestaque,
    categoriasPorSlug,
  },
};