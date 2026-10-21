// The one answer to « should the app be dark right now »: the user's saved choice, else the
// system setting. The Header owns the toggle; the full-screen error fallback (issue #19) reads
// the same answer because it renders precisely when the Header could not.
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('darkMode');
  if (saved !== null) return saved === 'true';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
