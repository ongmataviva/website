import type { Meta, StoryObj } from '@storybook/react';
import { NavBar } from './NavBar';
import { navLinks } from '../fixtures';

const meta: Meta<typeof NavBar> = {
  title: 'Mata Viva/Layout/NavBar',
  component: NavBar,
  parameters: { layout: 'fullscreen' },
  args: {
    links: navLinks,
    activeHref: '/noticias',
  },
};

export default meta;

type Story = StoryObj<typeof NavBar>;

export const Padrao: Story = {};

export const SemItemAtivo: Story = {
  args: {
    activeHref: undefined,
  },
};
