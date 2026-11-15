import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './EmptyState';

// The empty-state block (#158): one centred grey line, with an optional action.
const meta = { title: 'Feedback/EmptyState', component: EmptyState, args: { children: 'No topics saved yet.' } } satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TextOnly: Story = {};
export const WithAction: Story = {
  args: {
    children: 'No songs match your filters.',
    action: <button type="button" className="btn-link">Clear filters</button>,
  },
};
