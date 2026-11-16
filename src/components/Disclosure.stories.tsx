import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Disclosure } from './Disclosure';
import { CloseButton } from './CloseButton';

// The collapsible-header block (#182): the same header in the Songlist sidebar and in the
// song form; only the body keeps its context's style.
function Demo({ initial, title, className, bodyClassName, aside, children }: { initial: boolean; title: ReactNode; className: string; bodyClassName: string; aside?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(initial);
  return (
    <div className="max-w-md">
      <Disclosure title={title} open={open} onToggle={() => setOpen(o => !o)} className={className} bodyClassName={bodyClassName} aside={aside}>
        {children}
      </Disclosure>
    </div>
  );
}

const SIDEBAR = { className: 'card-base', bodyClassName: 'p-4 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200' };
const FORM = { className: 'border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700', bodyClassName: 'p-3 bg-gray-50 dark:bg-gray-800 rounded-b-md text-sm text-gray-700 dark:text-gray-200' };

const meta = { title: 'Layout/Disclosure' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const SidebarClosed: Story = { render: () => <Demo initial={false} title="Genre filters" {...SIDEBAR}>Rock · Jazz · Metal</Demo> };
export const SidebarOpen: Story = { render: () => <Demo initial title="Genre filters" {...SIDEBAR}>Rock · Jazz · Metal</Demo> };
export const FormDetails: Story = { render: () => <Demo initial title="Details" {...FORM}>Genres, key, BPM…</Demo> };
export const WithContentOnTheRight: Story = {
  render: () => (
    <Demo
      initial={false}
      title="Guitar"
      {...FORM}
      aside={<>
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Last played: <span className="font-medium">2 days ago</span></span>
        <button type="button" className="btn-primary btn-sm whitespace-nowrap">Mark as played</button>
        <CloseButton label="Remove Guitar" onClick={() => {}} />
      </>}
    >
      Difficulty, tuning, technique…
    </Demo>
  ),
};
