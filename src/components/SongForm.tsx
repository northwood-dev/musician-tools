import { useEffect, useState, useMemo } from 'react';
import type React from 'react';
import type { CreateSongDTO } from '../services/songService';
import type { SongPlay } from '../services/songPlayService';
import { instrumentTypeOptions, instrumentTechniquesMap } from '../constants/instrumentTypes';
import SongFormInstruments from './SongFormInstruments';

type Mode = 'add' | 'edit';

type SongFormProps = {
  mode: Mode;
  form: CreateSongDTO;
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onToggleGenre: (genre: string) => void;
  onChangeInstruments: (instruments: string[]) => void;
  onSetTechniques: (techniques: string[]) => void;
  onSetInstrumentDifficulty?: (instrumentType: string, difficulty: number | null) => void;
  onSetMyInstrumentUid: (uid: string | undefined) => void;
  onSetInstrumentTuning?: (instrumentType: string, tuning: string | null) => void;
  onToggleTechnique: (technique: string) => void;
  onSetInstrumentLinksForInstrument?: (instrumentType: string, links: Array<{ label?: string; url: string }>) => void;
  onSetStreamingLinks?: (links: Array<{ label: string; url: string }>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onMarkAsPlayedNow?: (instrumentType: string) => void;
  songPlays?: SongPlay[];
  formatLastPlayed?: (dateString: string | undefined) => string;
  myInstruments?: Array<{ uid: string; name: string; type?: string | null }>;
  playlistSlot?: React.ReactNode;
  suggestedAlbums?: string[];
  suggestedArtists?: string[];
};

const keyOptions = ['C','C#','Db','D','Eb','E','F','F#','Gb','G','Ab','A','Bb','B'];
const genreOptions = [
  'Acoustic',
  'Alternative',
  'Ambient',
  'Blues',
  'Classical',
  'Country',
  'Disco',
  'Drum & Bass',
  'EDM',
  'Electronic',
  'Folk',
  'Funk',
  'Gospel',
  'Hard Rock',
  'Hip-Hop',
  'House',
  'Indie',
  'Jazz',
  'K-Pop',
  'Latin',
  'Metal',
  'Pop',
  'Progressive',
  'Punk',
  'R&B / Soul',
  'Rap',
  'Reggae',
  'Rock',
  'Singer-Songwriter',
  'Ska',
  'Soundtrack',
  'Techno',
  'Trap',
  'World',
  'Other',
];

const getAvailableTechniques = (instrumentType: string) => {
  if (!instrumentType) return [];
  const list = instrumentTechniquesMap[instrumentType] || [];
  return [...list].sort((a, b) => a.localeCompare(b));
};

export function SongForm(props: SongFormProps) {
  const { mode, form, loading, onChange, onChangeInstruments, onSetTechniques, onToggleGenre, onSetInstrumentDifficulty, onSetMyInstrumentUid, onSetInstrumentTuning, onToggleTechnique, onSetInstrumentLinksForInstrument, onSetStreamingLinks, onSubmit, onCancel, onDelete, onMarkAsPlayedNow, songPlays, formatLastPlayed, myInstruments, playlistSlot, suggestedAlbums = [], suggestedArtists = [] } = props;
  const currentInstruments = useMemo(() => Array.isArray(form.instrument) ? form.instrument : (form.instrument ? [form.instrument] : []), [form.instrument]);
  const currentTechniques = useMemo(() => Array.isArray(form.technique) ? form.technique : [], [form.technique]);
  const currentGenres = Array.isArray(form.genre) ? form.genre : (form.genre ? [form.genre] : []);
  const [selectedInstrumentType, setSelectedInstrumentType] = useState('');
  const [expandedInstruments, setExpandedInstruments] = useState<Set<string>>(new Set(currentInstruments));
  const [detailsAccordionOpen, setDetailsAccordionOpen] = useState(false);
  const [genreSearchOpen, setGenreSearchOpen] = useState(false);
  const [genreSearchQuery, setGenreSearchQuery] = useState('');
  const [albumSearchOpen, setAlbumSearchOpen] = useState(false);
  const [selectedAlbumIndex, setSelectedAlbumIndex] = useState(-1);
  const [artistSearchOpen, setArtistSearchOpen] = useState(false);
  const [selectedArtistIndex, setSelectedArtistIndex] = useState(-1);
  // removed unused availableTechniques and filteredMyInstruments
  const allInstrumentLinks = Object.entries(form.instrumentLinks || {}).flatMap(([type, arr]) => (arr || []).map(l => ({ type, url: l.url, label: l.label })));

  useEffect(() => {
    // Filter out techniques that are not available for any of the current instruments
    if (currentInstruments.length === 0 && currentTechniques.length > 0) {
      onSetTechniques([]);
      return;
    }

    const allAvailableTechniques = new Set<string>();
    currentInstruments.forEach(inst => {
      const techniques = getAvailableTechniques(inst);
      techniques.forEach(t => allAvailableTechniques.add(t));
    });

    const nextTechniques = currentTechniques.filter(t => allAvailableTechniques.has(t));
    if (nextTechniques.length !== currentTechniques.length) {
      onSetTechniques(nextTechniques);
    }
  }, [currentInstruments, currentTechniques, onSetTechniques]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Top quick links aggregated from all instruments + bouton auto-add streaming links à droite */}
      {(allInstrumentLinks.length > 0 || (form.title?.trim() && form.artist?.trim())) && (
        <>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Links</div>
          <div className="flex mb-2 gap-2">
            <div className="flex flex-wrap gap-2 flex-1 min-w-0">
              {allInstrumentLinks.map((lnk) => (
                <button
                  key={`quick-link-${lnk.url}-${lnk.label ?? ''}`}
                  type="button"
                  className="inline-flex items-center rounded-md bg-brand-500 text-white px-3 py-1 text-sm hover:bg-brand-600 disabled:opacity-50"
                  onClick={() => {
                    if (lnk.url && (lnk.url.startsWith('http://') || lnk.url.startsWith('https://'))) {
                      window.open(lnk.url, '_blank');
                    }
                  }}
                  title={`${lnk.label || lnk.url} • ${lnk.type}`}
                >
                  <span className="mr-2 inline-flex items-center rounded bg-white/20 px-2 py-0.5 text-xs">{lnk.type}</span>
                  <span className="truncate max-w-[12rem]">{lnk.label || lnk.url}</span>
                </button>
              ))}
            </div>
            {(form.title?.trim() && form.artist?.trim() && typeof onSetStreamingLinks === 'function') && (
              <div className="flex items-start h-full">
                <button
                  type="button"
                  className="btn-secondary text-xs whitespace-nowrap"
                  onClick={async () => {
                    if (typeof onSetStreamingLinks === 'function') {
                      // Auto-generate streaming links
                      const searchQuery = `${form.artist || ''} ${form.title || ''}`.trim();
                      if (!searchQuery) return;
                      const links = [
                        { label: 'YouTube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}` },
                        { label: 'Spotify', url: `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}` },
                        { label: 'Apple Music', url: `https://music.apple.com/us/search?term=${encodeURIComponent(searchQuery)}` },
                        { label: 'Deezer', url: `https://www.deezer.com/search/${encodeURIComponent(searchQuery)}` },
                        { label: 'Tidal', url: `https://tidal.com/search?q=${encodeURIComponent(searchQuery)}&types=TRACKS` },
                        { label: 'Qobuz', url: `https://www.qobuz.com/us-en/search?q=${encodeURIComponent(searchQuery)}` }
                      ];
                      const currentLinks = form.streamingLinks || [];
                      const existingUrls = new Set(currentLinks.map(l => l.url));
                      const newLinks = links.filter(link => !existingUrls.has(link.url));
                      if (newLinks.length > 0) {
                        onSetStreamingLinks([...currentLinks, ...newLinks]);
                      }
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'Fetching...' : '🔗 Auto-add streaming links'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
      {form.streamingLinks && form.streamingLinks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.streamingLinks.map((link, idx) => (
              <div
                key={`streaming-link-${link.url}-${link.label ?? ''}`}
                className="inline-flex items-center gap-1 rounded-md bg-blue-100 dark:bg-blue-900 px-3 py-1 text-sm text-blue-800 dark:text-blue-100"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline truncate max-w-[20rem]"
                  title={link.label || link.url}
                >
                  {link.label || link.url}
                </a>
                <button
                  type="button"
                  className="ml-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 px-1"
                  onClick={(e) => {
                    e.preventDefault();
                    const updatedLinks = (form.streamingLinks || []).filter((_, i) => i !== idx);
                    onSetStreamingLinks?.(updatedLinks);
                  }}
                  title="Remove link"
                  disabled={loading}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
      )}
      <div>
        <label htmlFor="song-artist" className="block text-sm font-medium text-gray-700 dark:text-gray-100">Artist</label>
        <div className="relative">
          <input
            id="song-artist"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
            name="artist"
            value={form.artist}
            onChange={(e) => {
              onChange(e);
              if (e.target.value.length === 0) {
                setArtistSearchOpen(suggestedArtists.length > 0);
              } else {
                const hasMatch = suggestedArtists.some(artist => 
                  artist.toLowerCase().includes(e.target.value.toLowerCase())
                );
                setArtistSearchOpen(hasMatch);
              }
              setSelectedArtistIndex(-1);
            }}
            onKeyDown={(e) => {
              const filteredArtists = suggestedArtists.filter(artist => 
                !form.artist || artist.toLowerCase().includes(form.artist.toLowerCase())
              );
              
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setArtistSearchOpen(true);
                setSelectedArtistIndex(prev => 
                  prev < filteredArtists.length - 1 ? prev + 1 : prev
                );
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedArtistIndex(prev => prev > 0 ? prev - 1 : -1);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedArtistIndex >= 0 && filteredArtists[selectedArtistIndex]) {
                  onChange({
                    target: { name: 'artist', value: filteredArtists[selectedArtistIndex] }
                  } as React.ChangeEvent<HTMLInputElement>);
                  setArtistSearchOpen(false);
                  setSelectedArtistIndex(-1);
                }
              } else if (e.key === 'Escape') {
                setArtistSearchOpen(false);
                setSelectedArtistIndex(-1);
              }
            }}
            onFocus={() => setArtistSearchOpen(true)}
            onBlur={() => setTimeout(() => setArtistSearchOpen(false), 200)}
            disabled={loading}
            autoComplete="off"
          />
          {artistSearchOpen && suggestedArtists.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
              {suggestedArtists
                .filter(artist => 
                  !form.artist || artist.toLowerCase().includes(form.artist.toLowerCase())
                )
                .map((artist, index) => (
                <button
                  key={artist}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 last:border-b-0 ${
                    index === selectedArtistIndex 
                      ? 'bg-brand-100 dark:bg-brand-900/40' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => {
                    onChange({
                      target: { name: 'artist', value: artist }
                    } as React.ChangeEvent<HTMLInputElement>);
                    setArtistSearchOpen(false);
                    setSelectedArtistIndex(-1);
                  }}
                >
                  {artist}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="song-title" className="block text-sm font-medium text-gray-700 dark:text-gray-100">Title</label>
        <input
          id="song-title"
          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
          name="title"
          value={form.title}
          onChange={onChange}
          required
          disabled={loading}
        />
      </div>
      <div className="border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700">
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 h-10 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-100 overflow-hidden rounded-t-md"
          onClick={() => setDetailsAccordionOpen(!detailsAccordionOpen)}
          aria-expanded={detailsAccordionOpen}
        >
          <span className="font-medium">Details</span>
          <span>{detailsAccordionOpen ? '▾' : '▸'}</span>
        </button>
        {detailsAccordionOpen && (
          <div className="mt-0 space-y-4 p-3 bg-gray-50 dark:bg-gray-800 overflow-visible rounded-b-md">
            <div>
              <label htmlFor="genres-search" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Genres</label>
              <div className="relative z-30">
                <input
                  id="genres-search"
                  type="text"
                  placeholder="Search or select a genre"
                  value={genreSearchQuery}
                  onChange={(e) => setGenreSearchQuery(e.target.value)}
                  onFocus={() => setGenreSearchOpen(true)}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                  disabled={loading}
                />
                {genreSearchOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10"
                      onClick={() => setGenreSearchOpen(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' || e.key === 'Enter') {
                          setGenreSearchOpen(false);
                        }
                      }}
                      aria-label="Close genre dropdown"
                      tabIndex={-1}
                    />
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-32 overflow-y-auto">
                      {genreOptions
                        .filter(g => !currentGenres.includes(g) && g.toLowerCase().includes(genreSearchQuery.toLowerCase()))
                        .map(genre => (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => {
                              onToggleGenre(genre);
                              setGenreSearchQuery('');
                              setGenreSearchOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-100"
                            disabled={loading}
                          >
                            {genre}
                          </button>
                        ))}
                      {genreOptions.filter(g => !currentGenres.includes(g) && g.toLowerCase().includes(genreSearchQuery.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No genres found</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              {currentGenres.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentGenres.map(genre => (
                    <button
                      key={genre}
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full bg-brand-500 text-white px-3 py-1 text-sm hover:bg-brand-600 disabled:opacity-50"
                      onClick={() => onToggleGenre(genre)}
                      disabled={loading}
                      title={genre}
                    >
                      <span className="truncate">{genre}</span>
                      <span>✕</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="song-album" className="block text-sm font-medium text-gray-700 dark:text-gray-100">Album</label>
              <div className="relative">
                <input
                  id="song-album"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                  name="album"
                  value={typeof form.album === 'string' ? form.album : ''}
                  onChange={(e) => {
                    onChange(e);
                    if (e.target.value.length === 0) {
                      setAlbumSearchOpen(suggestedAlbums.length > 0);
                    } else {
                      const hasMatch = suggestedAlbums.some(album => 
                        album.toLowerCase().includes(e.target.value.toLowerCase())
                      );
                      setAlbumSearchOpen(hasMatch);
                    }
                    setSelectedAlbumIndex(-1);
                  }}
                  onKeyDown={(e) => {
                    const filteredAlbums = suggestedAlbums.filter(album => 
                      !form.album || album.toLowerCase().includes(form.album.toLowerCase())
                    );
                    
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setAlbumSearchOpen(true);
                      setSelectedAlbumIndex(prev => 
                        prev < filteredAlbums.length - 1 ? prev + 1 : prev
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedAlbumIndex(prev => prev > 0 ? prev - 1 : -1);
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (selectedAlbumIndex >= 0 && filteredAlbums[selectedAlbumIndex]) {
                        onChange({
                          target: { name: 'album', value: filteredAlbums[selectedAlbumIndex] }
                        } as React.ChangeEvent<HTMLInputElement>);
                        setAlbumSearchOpen(false);
                        setSelectedAlbumIndex(-1);
                      }
                    } else if (e.key === 'Escape') {
                      setAlbumSearchOpen(false);
                      setSelectedAlbumIndex(-1);
                    }
                  }}
                  onFocus={() => setAlbumSearchOpen(true)}
                  onBlur={() => setTimeout(() => setAlbumSearchOpen(false), 200)}
                  disabled={loading}
                  autoComplete="off"
                />
                {albumSearchOpen && suggestedAlbums.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
                    {suggestedAlbums
                      .filter(album => 
                        !form.album || album.toLowerCase().includes(form.album.toLowerCase())
                      )
                      .map((album, index) => (
                      <button
                        key={album}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 last:border-b-0 ${
                          index === selectedAlbumIndex 
                            ? 'bg-brand-100 dark:bg-brand-900/40' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                        onClick={() => {
                          onChange({
                            target: { name: 'album', value: album }
                          } as React.ChangeEvent<HTMLInputElement>);
                          setAlbumSearchOpen(false);
                          setSelectedAlbumIndex(-1);
                        }}
                      >
                        {album}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="song-bpm" className="block text-sm font-medium text-gray-700 dark:text-gray-100">BPM</label>
                <input
                  id="song-bpm"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                  name="bpm"
                  type="number"
                  value={form.bpm ?? ''}
                  onChange={onChange}
                  min={0}
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="song-key" className="block text-sm font-medium text-gray-700 dark:text-gray-100">Key</label>
                <select
                  id="song-key"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                  name="key"
                  value={form.key || ''}
                  onChange={onChange}
                  disabled={loading}
                >
                  <option value="">Select a key</option>
                  {keyOptions.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="song-pitch-standard" className="block text-sm font-medium text-gray-700 dark:text-gray-100">Pitch Standard (Hz)</label>
                <input
                  id="song-pitch-standard"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                  name="pitchStandard"
                  type="number"
                  value={form.pitchStandard ?? 440}
                  onChange={onChange}
                  min={400}
                  max={500}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Instruments</span>
        <SongFormInstruments
          currentInstruments={currentInstruments}
          instrumentDifficulty={form.instrumentDifficulty || {}}
          instrumentTuning={form.instrumentTuning || {}}
          currentTechniques={currentTechniques}
          instrumentLinks={form.instrumentLinks || null}
          myInstrumentUid={form.myInstrumentUid}
          onChangeInstruments={onChangeInstruments}
          onSetInstrumentDifficulty={onSetInstrumentDifficulty}
          onSetInstrumentTuning={onSetInstrumentTuning}
          onToggleTechnique={onToggleTechnique}
          onSetInstrumentLinksForInstrument={onSetInstrumentLinksForInstrument}
          onSetMyInstrumentUid={onSetMyInstrumentUid}
          onMarkAsPlayedNow={onMarkAsPlayedNow}
          myInstruments={myInstruments}
          songPlays={songPlays}
          formatLastPlayed={formatLastPlayed}
          mode={mode}
          loading={loading}
          expandedInstruments={expandedInstruments}
          setExpandedInstruments={setExpandedInstruments}
        />
        
        <div className="mt-4">
          <label htmlFor="add-instrument" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Add an instrument</label>
          <select
            id="add-instrument"
            value={selectedInstrumentType}
            onChange={(e) => {
              const value = e.target.value;
              if (value && !currentInstruments.includes(value)) {
                onChangeInstruments([...currentInstruments, value]);
                setExpandedInstruments(new Set([...expandedInstruments, value]));
              }
              setSelectedInstrumentType('');
            }}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
            disabled={loading}
          >
            <option value="">Select an instrument to add</option>
            {instrumentTypeOptions.filter(inst => !currentInstruments.includes(inst)).map(inst => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
        </div>
      </div>
      
      {playlistSlot}

      <div>
        <label htmlFor="song-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-100">Notes</label>
        <textarea
          id="song-notes"
          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
          name="notes"
          value={form.notes}
          onChange={onChange}
          rows={2}
          disabled={loading}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div>
          {mode === 'edit' && onDelete && (
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-red-600 text-white px-3 py-2 hover:bg-red-700 disabled:opacity-50"
              onClick={onDelete}
              disabled={loading}
            >
              Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-brand-500 text-white px-3 py-2 hover:bg-brand-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Loading...' : mode === 'edit' ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </form>
  );
}
