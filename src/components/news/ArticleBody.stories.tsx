import type { Meta, StoryObj } from '@storybook/react';
import { ArticleBody } from './ArticleBody';
import { noticias } from '../fixtures';

const meta: Meta<typeof ArticleBody> = {
  title: 'Mata Viva/News/ArticleBody',
  component: ArticleBody,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof ArticleBody>;

export const Default: Story = {
  args: {
    html: noticias[0].corpoHtml,
  },
};

export const ComLista: Story = {
  args: {
    html: noticias[2].corpoHtml,
  },
};