import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SessionHistoryCard } from '../components/SessionHistoryCard';
import type { SongNamesByUid } from '../utils/songNames';
import type { PracticeSession } from '../services/practiceSessionService';

function makeSession(items: PracticeSession['items']): PracticeSession {
  return { uid: 's1', date: '2026-06-21', instrumentType: 'Guitar', items };
}

function renderCard(session: PracticeSession, songNamesByUid: SongNamesByUid = new Map()) {
  return render(
    <MemoryRouter>
      <ul>
        <SessionHistoryCard session={session} songNamesByUid={songNamesByUid} />
      </ul>
    </MemoryRouter>
  );
}

test('a song entry links to its edit form; a topic entry stays plain text', () => {
  renderCard(makeSession([
    { uid: 'i1', sessionUid: 's1', songUid: 'song-1', label: 'Sweet Child', minutes: 10 },
    { uid: 'i2', sessionUid: 's1', topicUid: 't1', label: 'Pentatonic scale' },
  ]));

  const songLink = screen.getByRole('link', { name: 'Sweet Child' });
  expect(songLink).toHaveAttribute('href', '/songs/song-1'); // story 18.2: deep-link to the song route

  // The topic entry is plain text, never a link.
  expect(screen.queryByRole('link', { name: 'Pentatonic scale' })).not.toBeInTheDocument();
  expect(screen.getByText('Pentatonic scale')).toBeInTheDocument();
});

test('the whole "Artist - Title" is a single link to the song edit form', () => {
  renderCard(
    makeSession([{ uid: 'i1', sessionUid: 's1', songUid: 'song-1', label: 'Sweet Child' }]),
    new Map([['song-1', { title: 'Sweet Child', artist: "Guns N' Roses" }]]),
  );

  // Artist and title are both inside one link (navigation is by songUid, not the title).
  const link = screen.getByRole('link', { name: "Guns N' Roses - Sweet Child" });
  expect(link).toHaveAttribute('href', '/songs/song-1'); // story 18.2: deep-link to the song route
});

test('#5: an orphan entry keeps its label, greyed, with a "deleted" badge and no link', () => {
  renderCard(makeSession([
    { uid: 'i1', sessionUid: 's1', songUid: null, topicUid: null, label: 'Autumn Leaves', minutes: 10 },
  ]));

  expect(screen.getByText('Autumn Leaves')).toHaveClass('text-gray-400');
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByText('deleted')).toHaveAttribute('title', 'This item was deleted');
});

test('#5: song and topic entries that still exist carry no "deleted" badge', () => {
  renderCard(makeSession([
    { uid: 'i1', sessionUid: 's1', songUid: 'song-1', label: 'Sweet Child' },
    { uid: 'i2', sessionUid: 's1', topicUid: 't1', label: 'Pentatonic scale' },
  ]));

  expect(screen.queryByText('deleted')).not.toBeInTheDocument();
  expect(screen.getByText('Pentatonic scale')).not.toHaveClass('text-gray-400');
});

test('#13: an entry whose song still exists shows the live artist and title, not the snapshot', () => {
  renderCard(
    makeSession([
      { uid: 'i1', sessionUid: 's1', songUid: 'song-1', label: 'Sweet Child' },
      { uid: 'i2', sessionUid: 's1', songUid: null, topicUid: null, label: 'Autumn Leaves' },
    ]),
    new Map([['song-1', { title: "Sweet Child O' Mine", artist: "Guns N' Roses" }]]),
  );

  // Renamed song: current names everywhere, no mixed "new artist - old title".
  expect(screen.getByRole('link', { name: "Guns N' Roses - Sweet Child O' Mine" })).toHaveAttribute('href', '/songs/song-1');
  expect(screen.queryByText('Sweet Child')).not.toBeInTheDocument();
  // Orphan: no live song left, the snapshot label stays, greyed, badged.
  expect(screen.getByText('Autumn Leaves')).toHaveClass('text-gray-400');
  expect(screen.getByText('deleted')).toBeInTheDocument();
});
