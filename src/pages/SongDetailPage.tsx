import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { songService, type Song, type CreateSongDTO } from '../services/songService';
import { instrumentService, type Instrument } from '../services/instrumentService';
import { songPlayService, type SongPlay } from '../services/songPlayService';
import { SongForm } from '../components/SongForm';
import { toSlug } from '../utils/slug';
import { ConfirmDialog } from '../components/ConfirmDialog';

function SongDetailPage() {
  const { artist, title } = useParams<{ artist: string; title: string }>();
  const navigate = useNavigate();
  const [song, setSong] = useState<Song | null>(null);
  const [form, setForm] = useState<CreateSongDTO>({
    title: '',
    bpm: null,
    key: '',
    notes: '',
    tabs: '',
    instrument: [],
    instrumentLinks: {},
    artist: '',
    album: '',
    technique: [],
    pitchStandard: 440,
    tunning: '',
    lastPlayed: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [myInstruments, setMyInstruments] = useState<Instrument[]>([]);
  const [songPlays, setSongPlays] = useState<SongPlay[]>([]);
  const [selectedInstrumentType, setSelectedInstrumentType] = useState<string>('');

  useEffect(() => {
    loadSong();
    (async () => {
      try {
        const list = await instrumentService.getAll();
        setMyInstruments(list);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [artist, title]);

  const loadSong = async () => {
    if (!artist || !title) return;

    try {
      setLoading(true);
      setError(null);
      const songs = await songService.getAllSongs();
      const found = songs.find(
        s => toSlug(s.artist) === artist &&
             toSlug(s.title) === title
      );
      
      if (found) {
        setSong(found);
        // Charger les plays pour cette chanson
        try {
          const plays = await songPlayService.getPlays(found.uid);
          setSongPlays(plays);
        } catch (err) {
          console.error('Failed to load plays:', err);
          setSongPlays([]);
        }
        const { uid: _uid, createdAt, updatedAt, ...rest } = found;
        const normalized: CreateSongDTO = {
          ...rest,
          instrument: Array.isArray(rest.instrument)
            ? rest.instrument
            : rest.instrument
              ? [rest.instrument as unknown as string]
              : [],
          technique: Array.isArray(rest.technique)
            ? rest.technique
            : rest.technique
              ? [rest.technique as unknown as string]
              : [],
          myInstrumentUid: rest.myInstrumentUid || undefined,
          instrumentLinks: rest.instrumentLinks || {}
        };
        setForm(normalized);
      } else {
        setError('Song not found');
      }
    } catch (err) {
      setError('Error while loading song');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'bpm') {
      setForm({ ...form, bpm: value === '' ? null : Number(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const changeFormInstruments = (instruments: string[]) => {
    setForm(prevForm => ({ ...prevForm, instrument: instruments }));
    setSelectedInstrumentType(instruments[0] || '');
  };

  const setFormMyInstrumentUid = (uid: string | undefined) => {
    setForm(prevForm => ({ ...prevForm, myInstrumentUid: uid }));
  };

  const setFormTechniques = (techniques: string[]) => {
    setForm(prevForm => ({ ...prevForm, technique: techniques }));
  };

  const setFormTunning = (tunning: string | null) => {
    setForm(prevForm => ({ ...prevForm, tunning: tunning || undefined }));
  };

  const setInstrumentLinksForInstrument = (instrumentType: string, links: Array<{ label?: string; url: string }>) => {
    setForm(prevForm => ({
      ...prevForm,
      instrumentLinks: {
        ...(prevForm.instrumentLinks || {}),
        [instrumentType]: links,
      },
    }));
  };

  const toggleFormTechnique = (technique: string) => {
    setForm(prevForm => {
      const current = Array.isArray(prevForm.technique) ? prevForm.technique : (prevForm.technique ? [prevForm.technique] : []);
      const updated = current.includes(technique)
        ? current.filter(t => t !== technique)
        : [...current, technique];
      return { ...prevForm, technique: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!song) return;

    const payload: CreateSongDTO = {
      ...form,
      instrument: form.instrument && form.instrument.length > 0 ? form.instrument : null,
      technique: form.technique && form.technique.length > 0 ? form.technique : [],
      myInstrumentUid: form.myInstrumentUid ? form.myInstrumentUid : undefined,
      instrumentLinks: form.instrumentLinks || {}
    };

    try {
      setLoading(true);
      setError(null);
      await songService.updateSong(song.uid, payload);
      navigate('/songs');
    } catch (err) {
      setError('Error while saving song');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!song) return;

    try {
      setLoading(true);
      setError(null);
      await songService.deleteSong(song.uid);
      navigate('/songs');
    } catch (err) {
      setError('Error while deleting song');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPlayedNow = async (instrumentType: string) => {
    if (!song) return;

    try {
      setLoading(true);
      setError(null);
      await songPlayService.markPlayed(song.uid, { instrumentType });
      // Recharger les plays
      const plays = await songPlayService.getPlays(song.uid);
      setSongPlays(plays);
      const now = new Date().toISOString();
      await songService.updateSong(song.uid, { lastPlayed: now });
      // Ne pas réinitialiser le form - juste mettre à jour les plays
    } catch (err) {
      setError('Error while marking as played');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getLastPlayedForInstrument = (): string | undefined => {
    if (songPlays.length === 0) return undefined;
    if (selectedInstrumentType) {
      const plays = songPlays.filter(p => p.instrumentType === selectedInstrumentType);
      return plays.length > 0 ? plays[0].playedAt : undefined;
    }
    // Si aucun type d'instrument n'est sélectionné, retourner le dernier play global
    return songPlays[0].playedAt;
  };

  const formatLastPlayed = (dateString: string | undefined) => {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading && !song) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <p className="p-6">Loading...</p>
      </div>
    );
  }

  if (error && !song) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="max-w-2xl mx-auto p-6">
          <div className="mb-6">
            <Link to="/" className="text-2xl font-semibold text-gray-900 hover:text-brand-500 transition">Musician Tools</Link>
          </div>
          <div className="text-center space-y-4">
            <p className="text-red-600">{error || 'Song not found'}</p>
            <Link
              to="/songs"
              className="inline-flex items-center rounded-md bg-brand-500 text-white px-4 py-2 hover:bg-brand-600"
            >
              Back to songs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete song"
        message="Are you sure you want to delete this song?"
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
      {error && (
        <div className="mx-4 my-4 rounded-md border border-red-300 bg-red-50 text-red-700 p-3 flex items-center justify-between">
          <span>{error}</span>
          <button className="rounded-md px-2 py-1 hover:bg-red-100" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <Link to="/" className="text-2xl font-semibold text-gray-900 hover:text-brand-500 transition">Musician Tools</Link>
          <p className="text-sm text-gray-600">Edit song</p>
        </div>

        <SongForm
          mode="edit"
          form={form}
          loading={loading}
          onChange={handleChange}
          onChangeInstruments={changeFormInstruments}
          onSetMyInstrumentUid={setFormMyInstrumentUid}
          onSetTechniques={setFormTechniques}
          onSetTunning={setFormTunning}
          onToggleTechnique={toggleFormTechnique}
          onSetInstrumentLinksForInstrument={setInstrumentLinksForInstrument}
          onMarkAsPlayedNow={handleMarkAsPlayedNow}
          songPlays={songPlays}
          formatLastPlayed={formatLastPlayed}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/songs')}
          onDelete={() => setDeleteDialogOpen(true)}
          tabsFirst
          myInstruments={myInstruments.map(i => ({ uid: i.uid, name: i.name, type: i.type }))}
        />
      </div>
    </div>
  );
}

export default SongDetailPage;
