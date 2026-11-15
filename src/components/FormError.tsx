// The error message above an account form's fields after a failed submit (#129). One look
// everywhere: a box, dark mode included. One flag decides BOTH its colour and how it is
// announced, so they can't disagree:
//   • an error is red and an alert (announced at once);
//   • a rate limit ("too many attempts, try again later", story 15.1) is amber and a
//     status (announced politely) — it's information, not a mistake.
//
// `attempt` keys the message: pass a counter bumped on each submit, so a repeated
// identical error re-mounts and is announced again (#27). Only needed when the error
// can be set synchronously (client-side validation): React batches the clear and the
// set, so without the key the same text never leaves the DOM. An error that arrives
// after a server call is already re-mounted, because the message is cleared during the
// request.
// Second shared building block of the design pass (#141), after ErrorBanner.
const LOOK = {
  error: 'rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/40 dark:text-red-300 px-4 py-3 text-sm',
  rateLimited: 'rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-4 py-3 text-sm',
};

export function FormError({ message, rateLimited = false, attempt }: {
  message: string | null;
  rateLimited?: boolean;
  attempt?: number;
}) {
  if (!message) return null;
  return (
    <div key={attempt} className={rateLimited ? LOOK.rateLimited : LOOK.error} role={rateLimited ? 'status' : 'alert'}>
      {message}
    </div>
  );
}
