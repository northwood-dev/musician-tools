import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LoadFailed } from './LoadFailed';

// The failed-load block (#216): what didn't load, announced, and Retry.
const meta = {
  title: 'Feedback/LoadFailed',
  component: LoadFailed,
  args: { children: "Couldn't load the Catalog.", onRetry: fn() },
} satisfies Meta<typeof LoadFailed>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
