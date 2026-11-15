import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Chip, RemovableChip, ToggleChip, Tag } from './Chip';
import { CloseButton } from './CloseButton';

// The chip block (#159): removable, toggle, static (holding a link and its own ✕) and tag.
const meta = { title: 'Forms/Chips' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <RemovableChip label="Rock" onRemove={fn()} />
        <RemovableChip label="Warmups" onRemove={fn()} dimmed ariaLabel="Warmups, being removed — click to keep" />
        <RemovableChip label="Jazz" onRemove={fn()} disabled />
      </div>
      <div className="flex flex-wrap gap-2">
        <ToggleChip pressed onToggle={fn()}>Rock</ToggleChip>
        <ToggleChip pressed={false} onToggle={fn()}>Reggae</ToggleChip>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip>
          <a href="#yt" className="hover:underline">YouTube</a>
          <CloseButton label="Remove YouTube link" onClick={fn()} tone="inherit" className="-my-1 -mr-2" />
        </Chip>
        <Tag>Draft</Tag>
      </div>
    </div>
  ),
};
