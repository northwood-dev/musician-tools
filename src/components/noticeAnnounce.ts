import type { NoticeTone } from './Notice';

// The default announcement of a message tone (#225): an error is read at once, the rest
// politely. Shared by <Notice> and <LiveNotice> so the two blocks can never disagree. Its own
// file: a component file may only export components (react-refresh).
export const defaultAnnounce = (tone: NoticeTone): 'alert' | 'status' => (tone === 'error' ? 'alert' : 'status');
