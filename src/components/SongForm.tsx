import { useEffect, useState } from 'react';
import type React from 'react';
import type { CreateSongDTO } from '../services/songService';
import type { SongPlay } from '../services/songPlayService';
import { instrumentTypeOptions, instrumentTechniquesMap, instrumentTuningsMap } from '../constants/instrumentTypes';

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

const getAvailableTunings = (instrumentType: string) => {
  if (!instrumentType) return [];
  return instrumentTuningsMap[instrumentType] || [];
};


const getLastPlayedForInstrument = (instrumentType: string, plays: SongPlay[] = [], formatter: (date: string | undefined) => string = (d) => d || '-'): string => {
  if (!plays || plays.length === 0) return '-';
  const instrumentPlays = plays.filter(p => p.instrumentType === instrumentType);
  if (instrumentPlays.length === 0) return '-';
  return formatter(instrumentPlays[0].playedAt);
};

export function SongForm(props: SongFormProps) {
  const { mode, form, loading, onChange, onChangeInstruments, onSetTechniques, onToggleGenre, onSetInstrumentDifficulty, onSetInstrumentTuning, onToggleTechnique, onSetInstrumentLinksForInstrument, onSetStreamingLinks, onSubmit, onCancel, onDelete, onMarkAsPlayedNow, songPlays, formatLastPlayed, myInstruments, playlistSlot } = props;
  const currentInstruments = Array.isArray(form.instrument) ? form.instrument : (form.instrument ? [form.instrument] : []);
  const currentTechniques = Array.isArray(form.technique) ? form.technique : [];
  const currentGenres = Array.isArray(form.genre) ? form.genre : (form.genre ? [form.genre] : []);
  const [selectedInstrumentType, setSelectedInstrumentType] = useState('');
  const [expandedInstruments, setExpandedInstruments] = useState<Set<string>>(new Set(currentInstruments));
  const [detailsAccordionOpen, setDetailsAccordionOpen] = useState(false);
  const [newLinkInputs, setNewLinkInputs] = useState<Record<string, { label: string; url: string }>>({});
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
                      // Simulate the logic from SongsPage/SongDetailPage
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
        <>
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
        </>
      )}
      <div>
        <label htmlFor="song-artist" className="block text-sm font-medium text-gray-700 dark:text-gray-100">Artist</label>
        <input
          id="song-artist"
          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
          name="artist"
          value={form.artist}
          onChange={onChange}
          disabled={loading}
        />
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
      <div className="border border-gray-200 dark:border-gray-700 rounded-md">
        <button
          type="button"
          className="w-full flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-100"
          onClick={() => setDetailsAccordionOpen(!detailsAccordionOpen)}
          aria-expanded={detailsAccordionOpen}
        >
          <span className="font-medium">Details</span>
          <span>{detailsAccordionOpen ? '▾' : '▸'}</span>
        </button>
        {detailsAccordionOpen && (
          <div className="mt-0 space-y-4 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Genres</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {genreOptions.map(genre => (
                  <label
                    key={genre}
                    className="flex items-center gap-2 rounded-md px-2 py-1 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={currentGenres.includes(genre)}
                      onChange={() => onToggleGenre(genre)}
                      disabled={loading}
                      className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600 accent-brand-500 dark:accent-brand-400"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-100 truncate">{genre}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Select one or more styles.</p>
            </div>
            <div>
              <label htmlFor="song-album" className="block text-sm font-medium text-gray-700 dark:text-gray-100">Album</label>
              <input
                id="song-album"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                name="album"
                value={typeof form.album === 'string' ? form.album : ''}
                onChange={onChange}
                disabled={loading}
              />
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
        <div className="space-y-2">
          {currentInstruments.map((instrumentType) => {
            const isExpanded = expandedInstruments.has(instrumentType);
            const filteredMyInstruments = instrumentType && myInstruments && myInstruments.length > 0
              ? myInstruments.filter(mi => (mi.type || '').toLowerCase() === instrumentType.toLowerCase())
              : [];
            const instrumentTechniques = getAvailableTechniques(instrumentType);
            
            return (
              <div key={instrumentType} className="border border-gray-200 dark:border-gray-700 rounded-md">
                <div className="flex items-center">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-100"
                    onClick={() => {
                      const next = new Set(expandedInstruments);
                      if (next.has(instrumentType)) {
                        next.delete(instrumentType);
                      } else {
                        next.add(instrumentType);
                      }
                      setExpandedInstruments(next);
                    }}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{instrumentType}</span>
                      {formatLastPlayed && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Last played: <span className="font-medium">{getLastPlayedForInstrument(instrumentType, songPlays, formatLastPlayed)}</span>
                        </span>
                      )}
                    </div>
                    <span>{isExpanded ? '▾' : '▸'}</span>
                  </button>
                  <div className="flex items-center gap-2 ml-2">
                    {onMarkAsPlayedNow && mode === 'edit' && (
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md bg-brand-500 text-white px-2 py-1 text-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsPlayedNow(instrumentType);
                        }}
                        disabled={loading}
                        title="Mark this instrument as played"
                      >
                        Mark as played
                      </button>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md bg-gray-200 text-gray-800 px-2 py-1 text-sm hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeInstruments(currentInstruments.filter(i => i !== instrumentType));
                        const next = new Set(expandedInstruments);
                        next.delete(instrumentType);
                        setExpandedInstruments(next);
                      }}
                      disabled={loading}
                      title="Remove this instrument"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-0 space-y-4 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    {filteredMyInstruments && filteredMyInstruments.length > 0 && (
                      <div>
                        <label htmlFor={`my-instrument-${instrumentType}`} className="block text-sm font-medium text-gray-700 dark:text-gray-100">My instrument</label>
                        <select
                          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                          name="myInstrumentUid"
                          value={form.myInstrumentUid || ''}
                          onChange={onChange}
                          disabled={loading}
                        >
                          <option value="">Select my instrument</option>
                          {filteredMyInstruments.map(mi => (
                            <option key={mi.uid} value={mi.uid}>{mi.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="block text-sm font-medium text-gray-700 dark:text-gray-100">Difficulty (1-5)</span>
                        <div className="flex items-center gap-1" role="radiogroup" aria-label="Difficulty" aria-live="polite">
                          {[1,2,3,4,5].map(n => {
                            const current = form.instrumentDifficulty ? form.instrumentDifficulty[instrumentType] : null;
                            const active = typeof current === 'number' && n <= current;
                            return (
                              <button
                                key={n}
                                type="button"
                                className={`text-lg leading-none ${active ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500 focus:outline-none`}
                                onClick={() => {
                                  const next = current === n ? null : n;
                                  onSetInstrumentDifficulty?.(instrumentType, next);
                                }}
                                disabled={loading}
                                aria-pressed={active}
                                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                              >
                                ★
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {getAvailableTunings(instrumentType).length > 0 && (
                      <div>
                        <label htmlFor={`tuning-${instrumentType}`} className="block text-sm font-medium text-gray-700 dark:text-gray-100">Tuning</label>
                        <select
                          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                          value={(form.instrumentTuning && form.instrumentTuning[instrumentType] !== undefined && form.instrumentTuning[instrumentType] !== null)
                            ? form.instrumentTuning[instrumentType]
                            : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : e.target.value;
                            onSetInstrumentTuning?.(instrumentType, val);
                          }}
                          disabled={loading}
                        >
                          <option value="">Select tuning</option>
                          {getAvailableTunings(instrumentType).map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {instrumentTechniques && instrumentTechniques.length > 0 && (
                      <div>
                        <span className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Techniques</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {instrumentTechniques.map(technique => (
                            <label
                              key={technique}
                              className="flex items-center gap-2 rounded-md px-2 py-1 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={currentTechniques.includes(technique)}
                                onChange={() => onToggleTechnique(technique)}
                                disabled={loading}
                                className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600 accent-brand-500 dark:accent-brand-400"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-100 truncate">{technique}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Links</span>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {(form.instrumentLinks?.[instrumentType] ?? []).map((lnk, idx) => (
                            <div
                              key={`${instrumentType}-link-${lnk.url}-${lnk.label ?? ''}`}
                              className="inline-flex items-stretch overflow-hidden rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                            >
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 px-3 py-1 text-sm text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50"
                                onClick={() => {
                                  const u = (lnk.url || '').trim();
                                  if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
                                    window.open(u, '_blank');
                                  }
                                }}
                                title={lnk.label || lnk.url}
                                disabled={loading}
                              >
                                <span className="truncate max-w-[11rem]">{lnk.label || lnk.url}</span>
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center px-2 text-gray-700 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-l border-gray-300 dark:border-gray-600"
                                onClick={() => {
                                  const currentLinks = form.instrumentLinks?.[instrumentType] ?? [];
                                  const nextLinks = currentLinks.filter((_, i) => i !== idx);
                                  if (onSetInstrumentLinksForInstrument) {
                                    onSetInstrumentLinksForInstrument(instrumentType, nextLinks);
                                  }
                                }}
                                disabled={loading}
                                title="Remove link"
                              >
                                <span className="sr-only">Remove link</span>
                                <span aria-hidden="true">✕</span>
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                            type="text"
                            placeholder="Label (ex, Tabs video)"
                            value={(newLinkInputs[instrumentType]?.label) || ''}
                            onChange={(e) => setNewLinkInputs(prev => ({ ...prev, [instrumentType]: { ...(prev[instrumentType] || { label: '', url: '' }), label: e.target.value } }))}
                            disabled={loading}
                          />
                          <input
                            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                            type="url"
                            placeholder="https://example.com"
                            value={(newLinkInputs[instrumentType]?.url) || ''}
                            onChange={(e) => setNewLinkInputs(prev => ({ ...prev, [instrumentType]: { ...(prev[instrumentType] || { label: '', url: '' }), url: e.target.value } }))}
                            disabled={loading}
                          />
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md bg-brand-500 text-white px-2 py-1 text-sm hover:bg-brand-600 disabled:opacity-50"
                            onClick={() => {
                              const val = newLinkInputs[instrumentType] || { label: '', url: '' };
                              const url = (val.url || '').trim();
                              if (!url) return;
                              const label = (val.label || '').trim();
                              const currentLinks = form.instrumentLinks?.[instrumentType] ?? [];
                              const nextLinks = [...currentLinks, { url, label: label || undefined }];
                              if (onSetInstrumentLinksForInstrument) {
                                onSetInstrumentLinksForInstrument(instrumentType, nextLinks);
                              }
                              setNewLinkInputs(prev => ({ ...prev, [instrumentType]: { label: '', url: '' } }));
                            }}
                            disabled={loading}
                          >
                            Add link
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Add resources for this instrument (videos, tabs, lessons).</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          <div>
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
