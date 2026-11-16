import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs } from './Tabs';

// The tabs block (#181): click a tab, or focus one and use ← → Home End.
function Demo() {
  const [tab, setTab] = useState<'entries' | 'collections'>('entries');
  return (
    <Tabs
      label="Curate sections"
      tabs={[{ value: 'entries', label: 'Entries' }, { value: 'collections', label: 'Collections' }]}
      value={tab}
      onChange={setTab}
    >
      <p className="text-sm text-gray-700 dark:text-gray-200">
        {tab === 'entries' ? 'All entries (128)' : 'Rock 90s · Jazz standards'}
      </p>
    </Tabs>
  );
}

const meta = { title: 'Navigation/Tabs' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const CurateSections: Story = { render: () => <Demo /> };
