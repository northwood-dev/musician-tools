import type { Meta, StoryObj } from '@storybook/react-vite';

// The field block (#157): input-base and label-base, the shared classes every form uses
// (the song form included since #157), in their states.
const meta = { title: 'Forms/Fields' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <div>
        <label htmlFor="f-title" className="label-base">Title</label>
        <input id="f-title" className="input-base" placeholder="Wonderwall" />
      </div>
      <div>
        <label htmlFor="f-instrument" className="label-base">Instrument</label>
        <select id="f-instrument" className="input-base"><option>Guitar</option><option>Bass</option></select>
      </div>
      <div>
        <label htmlFor="f-duration" className="label-base">Duration (error)</label>
        <input id="f-duration" className="input-base border-red-500 focus:border-red-500 dark:border-red-500 dark:focus:border-red-500" defaultValue="9:99" aria-invalid="true" />
      </div>
      <div>
        <label htmlFor="f-disabled" className="label-base">Disabled</label>
        <input id="f-disabled" className="input-base" defaultValue="Saving…" disabled />
      </div>
      <div>
        <label htmlFor="f-notes" className="label-base">Notes</label>
        <textarea id="f-notes" className="input-base" rows={3} />
      </div>
    </div>
  ),
};
