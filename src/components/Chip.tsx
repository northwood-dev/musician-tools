import type { ReactNode, Ref } from 'react';

// The chip block of the design pass (#141, #159): one shape for genres, languages,
// playlists, aliases, links and tags, instead of the brand / grey / amber pills copied by
// hand. Four uses:
//   <RemovableChip>  a selected value; clicking the chip removes it. Its name is
//                    "Remove {label}" (it used to read "Rock ✕"); the ✕ is decorative.
//   <ToggleChip>     a filter or option that is on or off (aria-pressed).
//   <Chip>           a static chip holding other content (a link and its own ✕ button).
//   <Tag>            a small static label (e.g. "Draft").
const SHAPE = 'inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-sm motion-safe:transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const ON = 'bg-brand-500 text-white hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700';
const OFF = 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700';
const NEUTRAL = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';

export function RemovableChip({
  label,
  onRemove,
  disabled,
  title,
  ariaLabel,
  dimmed,
  busy,
  ref,
}: {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
  title?: string;
  /** Overrides "Remove {label}" when the chip means something else (e.g. "click to keep"). */
  ariaLabel?: string;
  /** Faded: the value is on its way out (a playlist being removed). */
  dimmed?: boolean;
  /** A slow request is running: a small spinner shows, and the chip says so (aria-busy). */
  busy?: boolean;
  /** Lets a list move focus to a given chip (#195). */
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      className={`${SHAPE} ${ON} ${dimmed ? 'opacity-50' : ''}`}
      onClick={onRemove}
      disabled={disabled}
      title={title ?? label}
      aria-label={ariaLabel ?? `Remove ${label}`}
      aria-busy={busy || undefined}
    >
      <span className="truncate">{label}</span>
      {busy && <span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" />}
      <span aria-hidden="true">✕</span>
    </button>
  );
}

export function ToggleChip({ pressed, onToggle, disabled, title, children }: {
  pressed: boolean;
  onToggle: () => void;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-pressed={pressed} className={`${SHAPE} ${pressed ? ON : OFF}`} onClick={onToggle} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

export function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`${SHAPE} ${NEUTRAL} ${className}`}>{children}</span>;
}

export function Tag({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" title={title}>
      {children}
    </span>
  );
}
