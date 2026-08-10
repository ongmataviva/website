import type { Meta, StoryObj } from '@storybook/react';
import { AuthorByline } from './AuthorByline';
import { autores } from '../fixtures';

const meta: Meta<typeof AuthorByline> = {
  title: 'Mata Viva/News/AuthorByline',
  component: AuthorByline,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof AuthorByline>;

export const Default: Story = {
  args: {
    autor: autores[0],
  },
};

export const Equipe: Story = {
  args: {
    autor: autores[1],
  },
};

export const SemCargo: Story = {
  args: {
    autor: { ...autores[0], cargo: undefined },
  },
};