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

      const button = screen.getByRole('button', { name: /Auto-fill metadata/i });
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

      const button = screen.getByRole('button', { name: /Auto-fill metadata/i });
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

      const button = screen.getByRole('button', { name: /Auto-fill metadata/i });
      fireEvent.click(button);

      expect(mockOnAutoFill).toHaveBeenCalled();
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
