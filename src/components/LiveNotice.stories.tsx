import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiveNotice } from './LiveNotice';

// A message whose announcement region is always there (#225). Empty, it shows nothing.
const meta = {
  title: 'Feedback/LiveNotice',
  component: LiveNotice,
  args: { tone: 'success', children: '"Wonderwall" rejected.' },
} satisfies Meta<typeof LiveNotice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};
export const Error: Story = { args: { tone: 'error', children: 'Could not reject "Wonderwall".' } };
export const WithAction: Story = {
  args: {
    tone: 'error',
    label: 'Songs and topics error',
    children: "Couldn't load your songs and topics: the song and topic menus may be incomplete.",
    action: <button type="button" className="btn-secondary btn-sm">Retry</button>,
  },
};
export const Empty: Story = { args: { children: null } };
