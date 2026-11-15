// The page error banner (#129): shown at the top of a page when a load or a save fails.
// One look everywhere (the glass card, dark mode included), always announced at once
// (role="alert"), and a ✕ with an accessible name. It replaces five hand-written copies
// that had drifted: three lacked dark mode and the ✕'s name. First shared building
// block of the design pass (#141).
export function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mx-4 my-4 card-base glass-effect text-red-700 bg-red-50/80 border border-red-200 dark:text-red-300 dark:bg-red-900/40 dark:border-red-800 flex items-center justify-between"
    >
      <span>{message}</span>
      <button type="button" aria-label="Dismiss error" className="btn-secondary text-xs" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
}
