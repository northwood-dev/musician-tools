import { Notice } from './Notice';

// The page error banner (#129): shown at the top of a page when a load or a save fails.
// Always announced at once, with a ✕ named "Dismiss error". Since #153 it is a red
// <Notice> with page margins, so it shares the error recipe with every other message.
export function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <Notice tone="error" onDismiss={onDismiss} dismissLabel="Dismiss error" className="mx-4 my-4">
      {message}
    </Notice>
  );
}
