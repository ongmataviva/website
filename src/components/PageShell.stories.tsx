import type { Meta, StoryObj } from '@storybook/react';
import { PageShell } from './PageShell';
import { paginas } from './fixtures';

const meta: Meta<typeof PageShell> = {
  title: 'Mata Viva/PageShell',
  component: PageShell,
  parameters: { layout: 'fullscreen' },
  args: {
    pagina: paginas[0],
  },
};

export default meta;

type Story = StoryObj<typeof PageShell>;

export const Sobre: Story = {};

export const Contato: Story = {
  args: {
    pagina: paginas[2],
  },
};