import type { MouseEvent } from 'react';

// The ✕ of the button block (#154): close a panel, dismiss a message, clear a field,
// remove an item. `label` is REQUIRED — it is the accessible name and the tooltip — so no
// ✕ can ship as an unnamed "✕ button" again (three did before). A 32px target with a
// visible keyboard focus. `tone="inherit"` takes the surrounding text colour (inside a
// coloured Notice); the default is a quiet grey. Position it with `className`.
export function CloseButton({
  label,
  onClick,
  disabled,
  tone = 'quiet',
  className = '',
}: {
  label: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  tone?: 'quiet' | 'inherit';
  className?: string;
}) {
  // The type makes the label required; this refuses an empty one too.
  if (!label.trim()) throw new Error('CloseButton needs a label: it is the button\'s accessible name.');
  const colour = tone === 'inherit'
    ? 'opacity-70 hover:opacity-100 focus-visible:opacity-100'
    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-sm motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current disabled:opacity-50 disabled:cursor-not-allowed ${colour} ${className}`}
    >
      <span aria-hidden="true">✕</span>
    </button>
  );
}
