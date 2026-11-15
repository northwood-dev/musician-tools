import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormError } from './FormError';

// The error above an account form after a failed submit (#129): red and announced at
// once, or amber and announced politely for a rate limit.
const meta = {
  title: 'Feedback/FormError',
  component: FormError,
  args: { message: 'Passwords do not match' },
} satisfies Meta<typeof FormError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {};

export const RateLimited: Story = {
  args: { message: 'Too many attempts. Please try again in a few minutes.', rateLimited: true },
};
