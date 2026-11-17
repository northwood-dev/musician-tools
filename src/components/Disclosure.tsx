import { useId, type ReactNode } from 'react';

// The collapsible-header block of the design pass (#141, #180, #182): one header for every
// section that folds (the Songlist sidebar sections, the song form's Details and instrument
// headers). The header is a button named by its title, with aria-expanded / aria-controls;
// the arrow sits on the right (▸ closed, rotated to point down when open, animated only
// under motion-safe). `aside` puts extra controls on the right, outside the header button
// (a button can't hold buttons); `lead` puts one on the left of the title (the Songlist
// sidebar's ⋮⋮ drag handle, #185). The body keeps its context's style (`bodyClassName`), and
// is only rendered while open. Controlled by the caller (open + onToggle).
export function Disclosure({
  title,
  open,
  onToggle,
  aside,
  lead,
  className,
  bodyClassName,
  children,
}: {
  title: ReactNode;
  open: boolean;
  onToggle: () => void;
  aside?: ReactNode;
  lead?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const bodyId = useId();
  return (
    <div className={className}>
      {/* The row lights up when its title or arrow is hovered, not its `aside` controls. */}
      <div className={`flex items-center h-11 text-sm font-semibold text-gray-800 dark:text-gray-100 has-[>[data-toggle]:hover]:bg-gray-50 dark:has-[>[data-toggle]:hover]:bg-gray-700 motion-safe:transition-colors ${open ? 'rounded-t-md' : 'rounded-md'}`}>
        {lead && <div className="flex items-center pl-1 font-normal">{lead}</div>}
        <button
          type="button"
          data-toggle
          className={`flex-1 self-stretch flex items-center ${lead ? 'pl-1 pr-3' : 'px-3'} text-left`}
          aria-expanded={open}
          aria-controls={open ? bodyId : undefined}
          onClick={onToggle}
        >
          {title}
        </button>
        {aside && <div className="flex items-center gap-2 font-normal">{aside}</div>}
        <span
          data-toggle
          onClick={onToggle}
          className="self-stretch flex items-center px-3 cursor-pointer select-none"
        >
          <DisclosureArrow open={open} />
        </span>
      </div>
      {open && (
        <div id={bodyId} className={bodyClassName}>
          {children}
        </div>
      )}
    </div>
  );
}

// The one arrow of every collapsible header: ▸ closed, rotated to point down when open
// (animated only under motion-safe). Exported for the mobile "Filters" button, whose
// region (the whole sidebar) lives elsewhere in the page.
export function DisclosureArrow({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className={`inline-block text-lg leading-none text-gray-500 dark:text-gray-400 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out ${open ? 'rotate-90' : ''}`}>▸</span>
  );
}
