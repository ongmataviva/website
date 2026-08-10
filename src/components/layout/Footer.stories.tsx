import type { Meta, StoryObj } from '@storybook/react';
import { Footer } from './Footer';
import { footerLinks } from '../fixtures';

const meta: Meta<typeof Footer> = {
  title: 'Mata Viva/Layout/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen' },
  args: {
    links: footerLinks,
  },
};

export default meta;

type Story = StoryObj<typeof Footer>;

export const Padrao: Story = {};
