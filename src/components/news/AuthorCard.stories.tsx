import type { Meta, StoryObj } from '@storybook/react';
import { AuthorCard } from './AuthorCard';
import { autores } from '../fixtures';

const meta: Meta<typeof AuthorCard> = {
  title: 'Mata Viva/News/AuthorCard',
  component: AuthorCard,
  parameters: { layout: 'centered' },
  args: {
    autor: autores[0],
  },
};

export default meta;

type Story = StoryObj<typeof AuthorCard>;

export const Padrao: Story = {};

export const ComCargo: Story = {
  args: {
    autor: autores[1],
  },
};

export const ComBio: Story = {
  args: {
    autor: {
      ...autores[0],
      bio: 'Jornalista ambiental e morador da bacia do Água Branca desde 2012. Coordena o núcleo de comunicação da Associação Mata Viva e edita o portal de notícias.',
    },
  },
};