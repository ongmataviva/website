import type { Meta, StoryObj } from '@storybook/react';
import { TagList } from './TagList';
import { noticias } from '../fixtures';

const meta: Meta<typeof TagList> = {
  title: 'Mata Viva/News/TagList',
  component: TagList,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof TagList>;

export const Default: Story = {
  args: {
    tags: noticias[0].tags,
  },
};

export const TagUnico: Story = {
  args: {
    tags: ['queimadas'],
  },
};

export const MuitasTags: Story = {
  args: {
    tags: [
      'esgoto',
      'igarape-agua-branca',
      'saneamento',
      'ipaam',
      'meio-ambiente',
      'denuncia',
      'comunidade',
    ],
  },
};