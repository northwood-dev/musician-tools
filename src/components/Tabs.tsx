import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

// The tabs block of the design pass (#141, #180, #181), following the standard accessible
// tabs pattern: a named tab list, one panel showing the selected tab's content (passed as
// children), roving focus (only the selected tab is in the Tab order), ← → to move with
// wrap-around, Home / End to jump to the ends. Controlled by the caller (value + onChange).
export type TabItem<T extends string> = { value: T; label: ReactNode };

export function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  children,
}: {
  label: string;
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
}) {
  const baseId = useId();
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const tabId = (v: T) => `${baseId}-tab-${v}`;
  const panelId = `${baseId}-panel`;

  const select = (v: T) => {
    onChange(v);
    refs.current.get(v)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const target =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (target === null) return;
    e.preventDefault();
    select(tabs[target].value);
  };

  return (
    <>
      <div role="tablist" aria-label={label} className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
        {tabs.map((tab, index) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              ref={el => { if (el) refs.current.set(tab.value, el); else refs.current.delete(tab.value); }}
              type="button"
              role="tab"
              id={tabId(tab.value)}
              aria-selected={selected}
              aria-controls={selected ? panelId : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={e => onKeyDown(e, index)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 motion-safe:transition-colors ${selected ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={tabId(value)}>
        {children}
      </div>
    </>
  );
}
