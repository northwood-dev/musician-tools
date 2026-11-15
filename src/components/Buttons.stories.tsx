import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CloseButton } from './CloseButton';

// The button block (#154): four variants as classes (btn-primary, btn-secondary,
// btn-danger, btn-link) in two sizes (default, btn-sm), and <CloseButton> for ✕.
const meta = { title: 'Actions/Buttons' } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS = ['btn-primary', 'btn-secondary', 'btn-danger', 'btn-link'] as const;

export const Variants: Story = {
  render: () => (
    <div className="space-y-4">
      {(['', 'btn-sm'] as const).map(size => (
        <div key={size} className="flex flex-wrap items-center gap-3">
          <span className="w-20 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{size ? 'small' : 'default'}</span>
          {VARIANTS.map(v => (
            <button key={v} type="button" className={`${v} ${v === 'btn-link' ? '' : size}`}>{v.replace('btn-', '')}</button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map(v => (
        <button key={v} type="button" className={v} disabled>{v.replace('btn-', '')}</button>
      ))}
    </div>
  ),
};

export const Close: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <CloseButton label="Close" onClick={fn()} />
      <CloseButton label="Close (disabled)" onClick={fn()} disabled />
    </div>
  ),
};
