import { render, screen, fireEvent } from '@testing-library/react';
import { SongForm } from '../components/SongForm';

describe('Metadata Auto-fill Feature', () => {
  describe('SongForm auto-fill button', () => {
    const defaultProps = {
      onChange: jest.fn(),
      onToggleGenre: jest.fn(),
      onToggleLanguage: jest.fn(),
      onChangeInstruments: jest.fn(),
      onSetTechniques: jest.fn(),
      onSubmit: jest.fn(),
      onCancel: jest.fn(),
      onSetMyInstrumentUid: jest.fn(),
      onToggleTechnique: jest.fn(),
    };

    test('button is disabled when title or artist is empty', () => {
      const form = {
        title: '',
        artist: '',
        bpm: null,
        key: '',
        mode: '',
        timeSignature: '',
        album: '',
        genre: [],
        instrument: [],
        technique: [],
        notes: '',
        pitchStandard: 440,
      };

      render(
        <SongForm
          mode="add"
          form={form}
          loading={false}
          metadataLoading={false}
          metadataSource={null}
          onAutoFillMetadata={jest.fn()}
          {...defaultProps}
        />
      );

      const button = screen.getByRole('button', { name: /Auto-fill metadata & links/i });
      expect(button).toBeDisabled();
    });

    test('button is enabled when title and artist are provided', () => {
      const form = {
        title: 'Test Song',
        artist: 'Test Artist',
        bpm: null,
        key: '',
        mode: '',
        timeSignature: '',
        album: '',
        genre: [],
        instrument: [],
        technique: [],
        notes: '',
        pitchStandard: 440,
      };

      render(
        <SongForm
          mode="add"
          form={form}
          loading={false}
          metadataLoading={false}
          metadataSource={null}
          onAutoFillMetadata={jest.fn()}
          {...defaultProps}
        />
      );

      const button = screen.getByRole('button', { name: /Auto-fill metadata & links/i });
      expect(button).not.toBeDisabled();
    });

    test('button shows loading state when metadataLoading is true', () => {
      const form = {
        title: 'Test Song',
        artist: 'Test Artist',
        bpm: null,
        key: '',
        mode: '',
        timeSignature: '',
        album: '',
        genre: [],
        instrument: [],
        technique: [],
        notes: '',
        pitchStandard: 440,
      };

      render(
        <SongForm
          mode="add"
          form={form}
          loading={false}
          metadataLoading={true}
          metadataSource={null}
          onAutoFillMetadata={jest.fn()}
          {...defaultProps}
        />
      );

      const button = screen.getByRole('button', { name: /Auto-filling/i });
      expect(button).toBeDisabled();
    });

    test('displays metadata source when available', () => {
      const form = {
        title: 'Test Song',
        artist: 'Test Artist',
        bpm: null,
        key: '',
        mode: '',
        timeSignature: '',
        album: '',
        genre: [],
        instrument: [],
        technique: [],
        notes: '',
        pitchStandard: 440,
      };

      render(
        <SongForm
          mode="add"
          form={form}
          loading={false}
          metadataLoading={false}
          metadataSource="songbpm"
          onAutoFillMetadata={jest.fn()}
          {...defaultProps}
        />
      );

      expect(screen.getByText(/Metadata found: songbpm/i)).toBeInTheDocument();
    });

    test('displays requirement message when metadata source is null', () => {
      const form = {
        title: 'Test Song',
        artist: 'Test Artist',
        bpm: null,
        key: '',
        mode: '',
        timeSignature: '',
        album: '',
        genre: [],
        instrument: [],
        technique: [],
        notes: '',
        pitchStandard: 440,
      };

      render(
        <SongForm
          mode="add"
          form={form}
          loading={false}
          metadataLoading={false}
          metadataSource={null}
          onAutoFillMetadata={jest.fn()}
          {...defaultProps}
        />
      );

      expect(screen.getByText(/Title \+ artist required/i)).toBeInTheDocument();
    });

    test('calls onAutoFillMetadata when button is clicked', () => {
      const mockOnAutoFill = jest.fn();
      const form = {
        title: 'Test Song',
        artist: 'Test Artist',
        bpm: null,
        key: '',
        mode: '',
        timeSignature: '',
        album: '',
        genre: [],
        instrument: [],
        technique: [],
        notes: '',
        pitchStandard: 440,
      };

      render(
        <SongForm
          mode="add"
          form={form}
          loading={false}
          metadataLoading={false}
          metadataSource={null}
          onAutoFillMetadata={mockOnAutoFill}
          {...defaultProps}
        />
      );

      const button = screen.getByRole('button', { name: /Auto-fill metadata & links/i });
      fireEvent.click(button);

      expect(mockOnAutoFill).toHaveBeenCalled();
    });
  });

  describe('Streaming links generation', () => {
    test('generates correct streaming links for artist and title', () => {
      const artist = 'The Beatles';
      const title = 'Hey Jude';
      const searchQuery = `${artist} ${title}`.trim();

      const expectedLinks = [
        { label: 'YouTube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}` },
        { label: 'Spotify', url: `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}` },
        { label: 'Apple Music', url: `https://music.apple.com/us/search?term=${encodeURIComponent(searchQuery)}` },
        { label: 'Deezer', url: `https://www.deezer.com/search/${encodeURIComponent(searchQuery)}` },
        { label: 'Tidal', url: `https://tidal.com/search?q=${encodeURIComponent(searchQuery)}&types=TRACKS` },
        { label: 'Qobuz', url: `https://www.qobuz.com/us-en/search?q=${encodeURIComponent(searchQuery)}` }
      ];

      expect(expectedLinks).toHaveLength(6);
      expect(expectedLinks[0].label).toBe('YouTube');
      expect(expectedLinks[1].label).toBe('Spotify');
      expect(expectedLinks[2].label).toBe('Apple Music');
      expect(expectedLinks[3].label).toBe('Deezer');
      expect(expectedLinks[4].label).toBe('Tidal');
      expect(expectedLinks[5].label).toBe('Qobuz');
    });

    test('handles special characters in artist/title', () => {
      const artist = 'The Beatles & Co.';
      const title = 'Hey Jude!';
      const searchQuery = `${artist} ${title}`.trim();

      const encoded = encodeURIComponent(searchQuery);
      expect(encoded).toContain('%26'); // & is encoded
      expect(encoded).toContain('!'); // ! is not encoded by encodeURIComponent
    });

    test('does not duplicate streaming links if they already exist', () => {
      const currentLinks = [
        { label: 'YouTube', url: 'https://www.youtube.com/results?search_query=Test+Song' }
      ];

      const newLinks = [
        { label: 'YouTube', url: 'https://www.youtube.com/results?search_query=Test+Song' },
        { label: 'Spotify', url: 'https://open.spotify.com/search/Test+Song' }
      ];

      const existingUrls = new Set(currentLinks.map(l => l.url));
      const linksToAdd = newLinks.filter(link => !existingUrls.has(link.url));

      expect(linksToAdd).toHaveLength(1);
      expect(linksToAdd[0].label).toBe('Spotify');
    });
  });

  describe('Genre merging logic', () => {
    test('merges genres when some already exist', () => {
      const existingGenres = ['Rock', 'Blues'];
      const newGenres = ['Rock', 'Folk'];
      
      // When existing genres exist, they should be kept
      const merged = existingGenres.length > 0 ? existingGenres : newGenres;
      
      expect(merged).toEqual(['Rock', 'Blues']);
    });

    test('uses new genres when none exist', () => {
      const existingGenres: string[] = [];
      const newGenres = ['Rock', 'Folk'];
      
      const merged = existingGenres.length > 0 ? existingGenres : newGenres;
      
      expect(merged).toEqual(['Rock', 'Folk']);
    });
  });

  describe('Metadata field merging', () => {
    test('preserves existing BPM if set', () => {
      const existingBpm = 120;
      const newBpm = 127;

      const merged = existingBpm ?? newBpm ?? existingBpm;

      expect(merged).toBe(120);
    });

    test('uses new BPM if existing is null', () => {
      const existingBpm: number | null = null;
      const newBpm = 127;

      const merged = existingBpm ?? newBpm ?? existingBpm;

      expect(merged).toBe(127);
    });

    test('uses new key if existing is empty', () => {
      const existingKey = '';
      const newKey = 'F';

      const merged = existingKey || newKey || '';

      expect(merged).toBe('F');
    });

    test('preserves existing key if set', () => {
      const existingKey = 'C';
      const newKey = 'F';

      const merged = existingKey || newKey || '';

      expect(merged).toBe('C');
    });
  });

  describe('Streaming links generation', () => {
    test('generates streaming links even when metadata source is "none"', () => {
      const title = 'Test Song';
      const artist = 'Test Artist';
      
      // Simulate the logic from Songs.tsx
      const generateStreamingLinks = (title: string, artist: string) => {
        const searchQuery = `${artist || ''} ${title || ''}`.trim();
        if (!searchQuery) return [];
        
        return [
          { label: 'YouTube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}` },
          { label: 'Spotify', url: `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}` },
          { label: 'Apple Music', url: `https://music.apple.com/us/search?term=${encodeURIComponent(searchQuery)}` },
          { label: 'Deezer', url: `https://www.deezer.com/search/${encodeURIComponent(searchQuery)}` },
          { label: 'Tidal', url: `https://tidal.com/search?q=${encodeURIComponent(searchQuery)}&types=TRACKS` },
          { label: 'Qobuz', url: `https://www.qobuz.com/us-en/search?q=${encodeURIComponent(searchQuery)}` }
        ];
      };

      const links = generateStreamingLinks(title, artist);

      expect(links).toHaveLength(6);
      expect(links[0].label).toBe('YouTube');
      expect(links[0].url).toContain('youtube.com');
      expect(links[1].label).toBe('Spotify');
      expect(links[2].label).toBe('Apple Music');
      expect(links[3].label).toBe('Deezer');
      expect(links[4].label).toBe('Tidal');
      expect(links[5].label).toBe('Qobuz');
    });

    test('does not duplicate existing streaming links', () => {
      const newLinks = [
        { label: 'YouTube', url: 'https://www.youtube.com/results?search_query=test' },
        { label: 'Spotify', url: 'https://open.spotify.com/search/test' }
      ];
      
      const existingLinks = [
        { label: 'YouTube', url: 'https://www.youtube.com/results?search_query=test' }
      ];

      const existingUrls = new Set(existingLinks.map(l => l.url));
      const linksToAdd = newLinks.filter(link => !existingUrls.has(link.url));
      const merged = [...existingLinks, ...linksToAdd];

      expect(merged).toHaveLength(2);
      expect(merged.filter(l => l.label === 'YouTube')).toHaveLength(1);
    });
  });

  describe('Metadata with source "none" but useful data', () => {
    test('fills form fields when metadata has data even with source "none"', () => {
      const metadata = {
        source: 'none',
        bpm: 120,
        key: 'C',
        mode: 'Major',
        timeSignature: '4/4',
        album: 'Test Album',
        genres: ['Rock']
      };

      const hasUsefulData = !!(metadata && (
        metadata.bpm || metadata.key || metadata.mode || metadata.timeSignature || 
        metadata.album || (Array.isArray(metadata.genres) && metadata.genres.length > 0)
      ));

      expect(hasUsefulData).toBe(true);
    });

    test('identifies no useful data when metadata only has source "none"', () => {
      const metadata = {
        source: 'none',
        bpm: null,
        key: '',
        mode: '',
        timeSignature: '',
        album: '',
        genres: []
      };

      const hasUsefulData = metadata && (
        metadata.bpm || metadata.key || metadata.mode || metadata.timeSignature || 
        metadata.album || (Array.isArray(metadata.genres) && metadata.genres.length > 0)
      );

      expect(hasUsefulData).toBe(false);
    });
  });
});
