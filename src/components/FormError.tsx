import { Notice } from './Notice';

// The error message above an account form's fields after a failed submit (#129). Since
// #153 it is a <Notice>: red for an error, amber for a rate limit. One flag decides BOTH its colour and how it is
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
export function FormError({ message, rateLimited = false, attempt }: {
  message: string | null;
  rateLimited?: boolean;
  attempt?: number;
}) {
  if (!message) return null;
  return (
    <Notice key={attempt} tone={rateLimited ? 'warning' : 'error'}>
      {message}
    </Notice>
  );
}
