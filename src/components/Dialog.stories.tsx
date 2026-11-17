import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dialog } from './Dialog';
import { ConfirmDialog } from './ConfirmDialog';

// The dialog block (#203): every modal window in one frame, on the native <dialog>.
function Opener({ label, children }: { label: string; children: (close: () => void) => ReactNode }) {
  // Closed at first: the docs page shows every story at once, and open modals would stack.
  const [open, setOpen] = useState(false);
  return (
    <div className="p-4">
      <button type="button" className="btn-primary btn-sm" onClick={() => setOpen(true)}>{label}</button>
      {open && children(() => setOpen(false))}
    </div>
  );
}

const meta = { title: 'Layout/Dialog' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Confirmation: Story = {
  render: () => (
    <Opener label="Add 3 songs">
      {close => (
        <ConfirmDialog isOpen title="Add 3 songs to my songlist" message="They will be added as Guitar songs." confirmText="Add" onConfirm={close} onCancel={close} />
      )}
    </Opener>
  ),
};

export const Dangerous: Story = {
  render: () => (
    <Opener label="Delete">
      {close => (
        <ConfirmDialog isOpen isDangerous title="Delete song(s)" message="Are you sure you want to delete 2 songs? This cannot be undone." confirmText="Delete" onConfirm={close} onCancel={close} />
      )}
    </Opener>
  ),
};

export const WithContent: Story = {
  render: () => (
    <Opener label="Help">
      {close => (
        <Dialog open onClose={close} title="Keyboard shortcuts" size="md">
          <p className="text-sm text-gray-700 dark:text-gray-300">Any content: a table, a form, a switch…</p>
        </Dialog>
      )}
    </Opener>
  ),
};
