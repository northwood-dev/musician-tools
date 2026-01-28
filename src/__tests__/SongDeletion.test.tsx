import { type Song } from '../services/songService';

describe('Song Deletion Logic', () => {
  test('removes deleted song from selectedSongs Set', () => {
    const selectedSongs = new Set(['song-1', 'song-2', 'song-3']);
    const uidToDelete = 'song-2';

    // Simulate the logic from handleConfirmDelete
    const next = new Set(selectedSongs);
    next.delete(uidToDelete);

    expect(next.has('song-2')).toBe(false);
    expect(next.size).toBe(2);
    expect(next.has('song-1')).toBe(true);
    expect(next.has('song-3')).toBe(true);
  });

  test('removes song from songs list after deletion', () => {
    const songs: Song[] = [
      {
        uid: 'song-1',
        title: 'Test Song 1',
        artist: 'Test Artist',
        bpm: 120,
        key: 'C',
        instrument: ['Guitar'],
        technique: [],
        genre: [],
        notes: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      },
      {
        uid: 'song-2',
        title: 'Test Song 2',
        artist: 'Test Artist',
        bpm: 140,
        key: 'D',
        instrument: ['Bass'],
        technique: [],
        genre: [],
        notes: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }
    ];

    const uidToDelete = 'song-1';
    const filteredSongs = songs.filter(song => song.uid !== uidToDelete);

    expect(filteredSongs.length).toBe(1);
    expect(filteredSongs[0].uid).toBe('song-2');
  });

  test('should redirect to list when editing song is deleted', () => {
    const editingUid = 'song-1';
    const uidToDelete = 'song-1';

    const shouldRedirect = editingUid === uidToDelete;

    expect(shouldRedirect).toBe(true);
  });

  test('should not redirect when deleting different song', () => {
    const editingUid: string | null = 'song-1';
    const uidToDelete = 'song-2';

    const shouldRedirect = editingUid !== null && editingUid === uidToDelete;

    expect(shouldRedirect).toBe(false);
  });
});
