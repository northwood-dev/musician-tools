import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ErrorBanner } from './ErrorBanner';

// The page error banner (#129): top of a page when a load or a save fails.
const meta = {
  title: 'Feedback/ErrorBanner',
  component: ErrorBanner,
  args: { message: 'Could not load your playlists.', onDismiss: fn() },
} satisfies Meta<typeof ErrorBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongMessage: Story = {
  args: { message: 'Error while saving the song. Your changes are kept on this page — try again in a moment.' },
};
