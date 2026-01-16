import { render, screen, fireEvent } from '@testing-library/react';
import { SongForm } from '../components/SongForm';
import type { CreateSongDTO } from '../services/songService';

const baseForm: CreateSongDTO = {
  title: '',
  artist: '',
  album: '',
  notes: '',
  bpm: null,
  key: '',
  mode: '',
  timeSignature: '',
  pitchStandard: undefined,
  genre: [],
  technique: [],
  instrument: [],
  instrumentDifficulty: {},
  instrumentTuning: {},
  instrumentLinks: {},
  streamingLinks: []
};

function renderForm(overrides: Partial<CreateSongDTO> = {}, extraProps: Partial<React.ComponentProps<typeof SongForm>> = {}) {
  const form = { ...baseForm, ...overrides } as CreateSongDTO;
  const onChange = jest.fn();
  const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
  render(
    <SongForm
      mode="add"
      form={form}
      loading={false}
      onChange={onChange}
      onToggleGenre={jest.fn()}
      onChangeInstruments={jest.fn()}
      onSetTechniques={jest.fn()}
      onSetMyInstrumentUid={jest.fn()}
      onToggleTechnique={jest.fn()}
      onSubmit={onSubmit}
      onCancel={jest.fn()}
      suggestedAlbums={(extraProps as any).suggestedAlbums || ['Revolver']}
      suggestedArtists={(extraProps as any).suggestedArtists || ['The Beatles']}
    />
  );
  return { onChange };
}

test('updates time signature select and calls onChange', () => {
  const { onChange } = renderForm();
  fireEvent.click(screen.getByText('Details'));
  const select = screen.getByLabelText('Time Signature') as HTMLSelectElement;
  fireEvent.change(select, { target: { value: '4/4' } });
  expect(onChange).toHaveBeenCalled();
});

test('hides artist suggestions when exact single match', () => {
  renderForm({ artist: '' }, { suggestedArtists: ['The Beatles'] });
  const input = screen.getByLabelText('Artist') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'The Beatles' } });
  // Wait a tick for UI update
  // The dropdown should not be visible because it's a single exact match
  const dropdowns = screen.queryAllByRole('button', { name: 'The Beatles' });
  expect(dropdowns.length).toBe(0);
});

test('hides album suggestions when exact single match (parity with artist)', () => {
  renderForm({ album: '' }, { suggestedAlbums: ['Revolver'] });
  fireEvent.click(screen.getByText('Details'));
  const input = screen.getByLabelText('Album') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'Revolver' } });
  const dropdowns = screen.queryAllByRole('button', { name: 'Revolver' });
  expect(dropdowns.length).toBe(0);
});