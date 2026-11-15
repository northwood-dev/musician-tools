import { useId, type ReactNode } from 'react';
import { ErrorBanner } from '../components/ErrorBanner';
import { FormError } from '../components/FormError';
import { ListSkeleton, DetailPageSkeleton } from '../components/ListSkeleton';

// #152 — the design pass's demo page (#141). DEV ONLY: routed at /dev/styleguide only
// when isDevBuild, so it never exists in production. It shows every shared building
// block in every state, so northwood judges the look in one place; switch light/dark
// with the header's theme button. Each block ticket of #141 adds its section here.
function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="card-base glass-effect p-4 sm:p-5 space-y-3">
      <h2 id={id} className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      {note && <p className="text-sm text-gray-600 dark:text-gray-400">{note}</p>}
      {children}
    </section>
  );
}

function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      {children}
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Styleguide</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Dev only. The shared building blocks of the design pass (#141), in every state. Use the
          header&apos;s theme button to check light and dark mode.
        </p>
      </div>

      <Block title="Page error banner" note="Top of a page when a load or a save fails (#129).">
        <ErrorBanner message="Could not load your playlists." onDismiss={() => {}} />
      </Block>

      <Block title="Form error message" note="Above an account form after a failed submit (#129).">
        <State label="Error (alert)">
          <FormError message="Passwords do not match" />
        </State>
        <State label="Rate limited (status)">
          <FormError message="Too many attempts. Please try again in a few minutes." rateLimited />
        </State>
      </Block>

      <Block title="Loading placeholders" note="List and detail page skeletons.">
        <State label="List">
          <ListSkeleton rows={3} />
        </State>
        <State label="Detail page">
          <DetailPageSkeleton />
        </State>
      </Block>

      <Block title="Buttons" note="Today's shared classes; the button block (#154) replaces them.">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary">Primary</button>
          <button type="button" className="btn-primary" disabled>Primary disabled</button>
          <button type="button" className="btn-secondary">Secondary</button>
          <button type="button" className="btn-secondary" disabled>Secondary disabled</button>
        </div>
      </Block>
    </div>
  );
}
