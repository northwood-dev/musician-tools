import type { Meta, StoryObj } from '@storybook/react-vite';

// Today's shared button classes. The button block (#154) replaces this story with its own.
const meta = { title: 'Actions/Buttons (current classes)' } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Classes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn-primary">Primary</button>
      <button type="button" className="btn-primary" disabled>Primary disabled</button>
      <button type="button" className="btn-secondary">Secondary</button>
      <button type="button" className="btn-secondary" disabled>Secondary disabled</button>
    </div>
  ),
};
