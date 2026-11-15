import type { Meta, StoryObj } from '@storybook/react-vite';
import { Page, PageTitle } from './Page';

// The page block (#155): three named widths, the page's one main title, an optional
// description and actions.
const meta = {
  title: 'Layout/Page',
  component: Page,
  args: {
    width: 'wide',
    title: 'Songlist',
    description: 'Manage your songs, filters, and playlists.',
    actions: <button type="button" className="btn-primary">Add a song</button>,
    children: <div className="card-base glass-effect p-4 text-sm text-gray-600 dark:text-gray-300">Page content</div>,
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Wide: Story = {};
export const Content: Story = { args: { width: 'content', title: 'Profile', description: undefined, actions: undefined } };
export const EditableTitle: Story = {
  args: { width: 'content', title: undefined, description: undefined, actions: undefined },
  render: (args) => (
    <Page {...args}>
      <div className="flex items-baseline gap-3">
        <PageTitle>Beginner classics</PageTitle>
        <button type="button" className="btn-link">Rename</button>
      </div>
    </Page>
  ),
};
