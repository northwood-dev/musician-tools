import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// #155 drift guard: app pages get their frame (width, margins) and their one main title
// from <Page>. A page that writes its own `<h1>` or its own `max-w-… mx-auto` frame fails
// here, and so does a second h1 in the header. The sign-in pages and the home page keep
// their own centred layout and title, as decided in #141.
const SRC = join(__dirname, '..');
const OWN_LAYOUT = ['HomePage.tsx', 'LoginPage.tsx', 'RegisterPage.tsx', 'ForgotPasswordPage.tsx', 'ResetPasswordPage.tsx', 'VerifyEmailPage.tsx'];

const appPages = [
  ...readdirSync(join(SRC, 'pages'))
    .filter(f => f.endsWith('.tsx') && !f.includes('.test.') && !OWN_LAYOUT.includes(f))
    .map(f => `pages/${f}`),
  'components/SongsList.tsx', // the Songlist page's body
];

test.each(appPages)('%s takes its frame and main title from <Page>', (rel) => {
  const source = readFileSync(join(SRC, rel), 'utf8');
  const lines = source.split('\n');
  const ownTitles = lines.flatMap((l, i) => (/<h1\b/.test(l) ? [`${rel}:${i + 1}`] : []));
  const ownFrames = lines.flatMap((l, i) => (/\bmax-w-(md|lg|xl|[2-7]xl)\b/.test(l) && /\bmx-auto\b/.test(l) ? [`${rel}:${i + 1}`] : []));
  expect({ ownTitles, ownFrames }).toEqual({ ownTitles: [], ownFrames: [] });
});

test('the header logo is not a heading', () => {
  expect(readFileSync(join(SRC, 'components/Header.tsx'), 'utf8')).not.toMatch(/<h1\b/);
});
