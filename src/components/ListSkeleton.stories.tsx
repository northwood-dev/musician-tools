import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListSkeleton, DetailPageSkeleton } from './ListSkeleton';

// Loading placeholders (story 22.5). The loading block (#158) extends them to every list.
const meta = {
  title: 'Loading/Skeletons',
  component: ListSkeleton,
} satisfies Meta<typeof ListSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = { args: { rows: 4 } };
export const ListAnnounced: Story = { args: { rows: 4, label: 'Loading…' } };

export const DetailPage: Story = { render: () => <DetailPageSkeleton /> };
