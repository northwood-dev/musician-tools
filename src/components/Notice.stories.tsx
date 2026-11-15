import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Notice } from './Notice';

// The message block (#153): one recipe per tone. ErrorBanner, FormError, BulkRecap,
// DuplicateBanner and VerifyEmailBanner are uses of it.
const meta = {
  title: 'Feedback/Notice',
  component: Notice,
  args: { tone: 'info', children: 'If an account matches that email, we just sent a reset link.' },
} satisfies Meta<typeof Notice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = { args: { tone: 'error', children: 'Could not load your profile.' } };
export const Warning: Story = { args: { tone: 'warning', children: 'Too many attempts. Please try again in a few minutes.' } };
export const Info: Story = {};
export const Success: Story = { args: { tone: 'success', children: 'Display name updated' } };

export const Dismissable: Story = {
  args: { tone: 'info', label: 'Bulk action result', onDismiss: fn(), children: '3 added · 1 already in — "Beginner classics".' },
};

export const WithAction: Story = {
  args: {
    tone: 'warning',
    announce: 'none',
    children: 'A newer version of this song is in the Catalog.',
    action: <button type="button" className="btn-secondary text-sm">Refresh</button>,
  },
};

export const Strip: Story = {
  args: {
    tone: 'warning',
    variant: 'strip',
    children: <>Please verify your email to confirm your account. <button type="button" className="font-medium underline">Resend link</button></>,
  },
};
