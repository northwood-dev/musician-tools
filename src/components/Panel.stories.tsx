import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Panel } from './Panel';
import { useDismissablePanel } from '../hooks/useDismissablePanel';

// The panel block (#156): the frame of the panels that open under a button, with the
// shared hook (outside press and Escape close it).
function Demo({ size, title, closeDisabled, label, children }: { size?: 'md' | 'sm'; title?: string; closeDisabled?: boolean; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const panel = useDismissablePanel({ open, onClose: () => setOpen(false) });
  return (
    <div className="flex justify-end pr-4 pb-56">
      <div className="relative">
        <button ref={panel.buttonRef} type="button" className="btn-primary btn-sm" aria-expanded={open} aria-controls={panel.panelId} onClick={() => setOpen(o => !o)}>{label}</button>
        {open && (title
          ? <Panel panel={panel} size={size} title={title} onClose={() => setOpen(false)} closeDisabled={closeDisabled}>{children}</Panel>
          : <Panel panel={panel} size={size}>{children}</Panel>)}
      </div>
    </div>
  );
}

const meta = { title: 'Layout/Panel' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const BulkAction: Story = {
  render: () => (
    <Demo label="Add to playlist" title="Select playlists">
      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
        <label className="flex items-center gap-2"><input type="checkbox" /> Warmups</label>
        <label className="flex items-center gap-2"><input type="checkbox" /> Gig set</label>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="btn-secondary btn-sm">Cancel</button>
        <button type="button" className="btn-primary btn-sm">Add</button>
      </div>
    </Demo>
  ),
};

export const AccountLinks: Story = {
  render: () => (
    <Demo label="Account" size="sm">
      <a href="#profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Profile</a>
      <button type="button" className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Sign out</button>
    </Demo>
  ),
};

export const WhileSaving: Story = {
  render: () => (
    <Demo label="Set instrument" title="Add an instrument" closeDisabled>
      <p className="text-sm text-gray-600 dark:text-gray-300">Adding Bass to 3 songs…</p>
    </Demo>
  ),
};
