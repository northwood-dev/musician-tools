import { useEffect, useRef, useState, useMemo } from 'react';
import type React from 'react';
import type { CatalogSuggestion, CreateSongDTO, Song } from '../services/songService';
import type { SongPlay } from '../services/songPlayService';
import { instrumentTypeOptions, instrumentTechniquesMap } from '../constants/instrumentTypes';
import SongFormInstruments from './SongFormInstruments';
import { parseDurationToSeconds, formatSecondsToMmss } from '../utils/duration';
import { DuplicateBanner } from './DuplicateBanner';
// Shared option lists (story 19.5) — single source used by the Catalog curator form too.
import { keyOptions, timeSignatureOptions, modeOptions, genreOptions, languageOptions } from '../utils/songFieldOptions';
import { handleComboKeyDown, useScrollHighlightIntoView, comboboxInputAria, comboboxOptionAria } from '../utils/comboboxKeyboard';
import { AutocompleteInput } from './AutocompleteInput';
import { StreamingLinksEditor } from './StreamingLinksEditor';
import type { StreamingLink } from '../utils/streamingLinks';
import { instrumentsOf } from '../utils/songInstruments';
import { listOf } from '../utils/listOf';
import { RemovableChip } from './Chip';
import { Disclosure } from './Disclosure';
import { songLabel } from '../utils/songLabel';

type Mode = 'add' | 'edit';

type SongFormProps = {
  mode: Mode;
  form: CreateSongDTO;
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSetDurationSeconds?: (seconds: number | null) => void;
  onToggleGenre: (genre: string) => void;
  onToggleLanguage: (language: string) => void;
  onChangeInstruments: (instruments: string[]) => void;
  onSetTechniques: (techniques: string[]) => void;
  onSetInstrumentDifficulty?: (instrumentType: string, difficulty: number | null) => void;
  onSetMyInstrumentUid: (uid: string | undefined) => void;
  onSetInstrumentTuning?: (instrumentType: string, tuning: string | null) => void;
  onToggleTechnique: (technique: string) => void;
  onSetInstrumentLinksForInstrument?: (instrumentType: string, links: Array<{ label?: string; url: string }>) => void;
  onSetStreamingLinks?: (links: StreamingLink[]) => void;
  onSetCatalogSuggestion?: (value: Exclude<CatalogSuggestion, 'rejected'>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete?: () => void;
  onMarkAsPlayedNow?: (instrumentType: string) => void;
  songPlays?: SongPlay[];
  formatLastPlayed?: (dateString: string | undefined) => string;
  myInstruments?: Array<{ uid: string; name: string; type?: string | null }>;
  playlistSlot?: React.ReactNode;
  suggestedAlbums?: string[];
  suggestedArtists?: string[];
  metadataLoading?: boolean;
  metadataSource?: string | null;
  onAutoFillMetadata?: () => Promise<void>;
  // An existing song matching the current title + artist, surfaced live so the
  // user is told before the submit guard blocks — when adding, or when renaming
  // a song into a collision. onEditDuplicate jumps straight to its edit screen.
  duplicate?: Song | null;
  onEditDuplicate?: () => void;
};

const getAvailableTechniques = (instrumentType: string) => {
  if (!instrumentType) return [];
  const list = instrumentTechniquesMap[instrumentType] || [];
  return [...list].sort((a, b) => a.localeCompare(b));
};

export function SongForm(props: SongFormProps) {
  const { mode, form, loading, onChange, onSetDurationSeconds, onChangeInstruments, onSetTechniques, onToggleGenre, onToggleLanguage, onSetInstrumentDifficulty, onSetMyInstrumentUid, onSetInstrumentTuning, onToggleTechnique, onSetInstrumentLinksForInstrument, onSetStreamingLinks, onSetCatalogSuggestion, onSubmit, onDelete, onMarkAsPlayedNow, songPlays, formatLastPlayed, myInstruments, playlistSlot, suggestedAlbums = [], suggestedArtists = [], metadataLoading = false, metadataSource = null, onAutoFillMetadata, duplicate = null, onEditDuplicate } = props;
  // Passes only the field so the memo depends on form.instrument alone, not on the whole form.
  const currentInstruments = useMemo(() => instrumentsOf({ instrument: form.instrument }), [form.instrument]);
  const currentTechniques = useMemo(() => Array.isArray(form.technique) ? form.technique : [], [form.technique]);
  const currentGenres = listOf(form.genre);
  const currentLanguages = listOf(form.language);
  const [selectedInstrumentType, setSelectedInstrumentType] = useState('');
  const [expandedInstruments, setExpandedInstruments] = useState<Set<string>>(new Set(currentInstruments));
  const [detailsAccordionOpen, setDetailsAccordionOpen] = useState(false);
  // Free-text duration ("3:30" or decimal minutes); committed to the form as
  // whole seconds on blur. Kept as local state so the user can type freely.
  const [durationText, setDurationText] = useState(() => formatSecondsToMmss(form.durationSeconds));
  const [durationError, setDurationError] = useState<string | null>(null);
  const lastCommittedSeconds = useRef<number | null>(form.durationSeconds ?? null);
  // Re-seed the text only when the stored value changes from outside (e.g.
  // loading a song for edit, or our own blur commit canonicalising the format).
  useEffect(() => {
    const current = form.durationSeconds ?? null;
    if (current !== lastCommittedSeconds.current) {
      lastCommittedSeconds.current = current;
      setDurationText(formatSecondsToMmss(current));
      setDurationError(null);
    }
  }, [form.durationSeconds]);
  const [genreSearchOpen, setGenreSearchOpen] = useState(false);
  const [genreSearchQuery, setGenreSearchQuery] = useState('');
  const [selectedGenreIndex, setSelectedGenreIndex] = useState(-1);
  const [languageSearchOpen, setLanguageSearchOpen] = useState(false);
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [selectedLanguageIndex, setSelectedLanguageIndex] = useState(-1);
  // Keep the keyboard-highlighted option scrolled into view in the dropdowns.
  const genreListRef = useRef<HTMLDivElement>(null);
  const languageListRef = useRef<HTMLDivElement>(null);
  // artist/album comboboxes are now the shared <AutocompleteInput> (story 19.11) —
  // their open/highlight state + scroll-into-view live inside that component.
  // removed unused availableTechniques and filteredMyInstruments
  // Only http(s) links reach the bar (#114): React blocks javascript: in an href but not data:, and
  // links stored before #113 were never checked.
  const allInstrumentLinks = Object.entries(form.instrumentLinks || {})
    .flatMap(([type, arr]) => (arr || []).map(l => ({ type, url: l.url, label: l.label })))
    .filter(l => /^https?:\/\//i.test(l.url || ''));

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

  useScrollHighlightIntoView(genreListRef, selectedGenreIndex, genreSearchOpen);
  useScrollHighlightIntoView(languageListRef, selectedLanguageIndex, languageSearchOpen);

  // Lifted so the keyboard handler and the rendered dropdown index the SAME list.
  const filteredGenreOptions = genreOptions.filter(
    g => !currentGenres.includes(g) && g.toLowerCase().includes(genreSearchQuery.toLowerCase()),
  );
  const filteredLanguageOptions = languageOptions.filter(
    language => !currentLanguages.includes(language) && language.toLowerCase().includes(languageSearchQuery.toLowerCase()),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Top quick links aggregated from all instruments */}
      {allInstrumentLinks.length > 0 && (
        <>
          <div className="label-base">Links</div>
          <div className="flex flex-wrap gap-2">
            {allInstrumentLinks.map((lnk) => (
              // A real link (#114): opens in a new tab with no handle on the app (noopener).
              <a
                key={`quick-link-${lnk.url}-${lnk.label ?? ''}`}
                href={lnk.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary btn-sm"
                title={`${lnk.label || lnk.url} • ${lnk.type}`}
              >
                <span className="mr-2 inline-flex items-center rounded bg-white/20 px-2 py-0.5 text-xs">{lnk.type}</span>
                <span className="truncate max-w-[12rem]">{lnk.label || lnk.url}</span>
              </a>
            ))}
          </div>
        </>
      )}
      <div>
        <label htmlFor="song-artist" className="label-base">Artist</label>
        <AutocompleteInput
          id="song-artist"
          name="artist"
          value={form.artist}
          onValueChange={(v) => onChange({ target: { name: 'artist', value: v } } as React.ChangeEvent<HTMLInputElement>)}
          suggestions={suggestedArtists}
          inputClassName="input-base"
          disabled={loading}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="song-title" className="label-base">Title</label>
        <input
          id="song-title"
          className="input-base"
          name="title"
          value={form.title}
          onChange={onChange}
          required
          disabled={loading}
        />
      </div>
      {/* #211: a song typed by hand is suggested to the Catalog (checked by default). A song
          linked to the Catalog is in it already: no checkbox. `rejected` shows checked — the
          owner isn't told; unchecking then checking suggests it again. */}
      {onSetCatalogSuggestion && !form.sourceCatalogUid && (
        <div>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-500 dark:accent-brand-400"
              checked={form.catalogSuggestion === 'suggested' || form.catalogSuggestion === 'rejected'}
              onChange={(e) => onSetCatalogSuggestion(e.target.checked ? 'suggested' : 'private')}
              disabled={loading}
              aria-describedby="song-catalog-suggestion-help"
            />
            Suggest this song for the Catalog
          </label>
          <p id="song-catalog-suggestion-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Shares only the artist, title, musical details (key, BPM…) and official links, never your notes or instruments. Uncheck it for your own compositions.
          </p>
        </div>
      )}
      {duplicate && (
        <DuplicateBanner>
          <p>
            <span className="font-medium">"{songLabel(duplicate)}"</span>
            {' '}already exists in your songlist.
          </p>
          {onEditDuplicate && (
            <button
              type="button"
              onClick={onEditDuplicate}
              className="btn-link mt-1"
              disabled={loading}
            >
              Edit this song →
            </button>
          )}
        </DuplicateBanner>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={onAutoFillMetadata}
          disabled={loading || metadataLoading || !form.title || !form.artist}
        >
          {metadataLoading ? 'Auto-filling…' : 'Auto-fill metadata'}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {metadataSource ? `Metadata found: ${metadataSource}` : 'Artist + title required'}
        </p>
      </div>
      <Disclosure
        className="border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700"
        title="Details"
        open={detailsAccordionOpen}
        onToggle={() => setDetailsAccordionOpen(!detailsAccordionOpen)}
        bodyClassName="space-y-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-b-md"
      >
        <div>
          <label htmlFor="genres-search" className="label-base">Genres</label>
          <div className="relative z-30">
            <input
              id="genres-search"
              type="text"
              placeholder="Search or select a genre"
              value={genreSearchQuery}
              onChange={(e) => { setGenreSearchQuery(e.target.value); setSelectedGenreIndex(-1); }}
              onFocus={() => setGenreSearchOpen(true)}
              onBlur={() => setTimeout(() => setGenreSearchOpen(false), 200)}
              onKeyDown={(e) => handleComboKeyDown(
                e, filteredGenreOptions, selectedGenreIndex, setSelectedGenreIndex, setGenreSearchOpen,
                (genre) => { onToggleGenre(genre); setGenreSearchQuery(''); setGenreSearchOpen(false); setSelectedGenreIndex(-1); },
              )}
              className="input-base"
              disabled={loading}
              {...comboboxInputAria('song-genres-list', genreSearchOpen, selectedGenreIndex)}
            />
            {genreSearchOpen && (
                <div ref={genreListRef} id="song-genres-list" role="listbox" className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-32 overflow-y-auto">
                  {filteredGenreOptions.map((genre, index) => (
                      <button
                        key={genre}
                        type="button"
                        {...comboboxOptionAria('song-genres-list', index, selectedGenreIndex)}
                        onMouseEnter={() => setSelectedGenreIndex(index)}
                        onClick={() => {
                          onToggleGenre(genre);
                          setGenreSearchQuery('');
                          setGenreSearchOpen(false);
                          setSelectedGenreIndex(-1);
                        }}
                        className={`w-full text-left px-3 py-2 text-gray-700 dark:text-gray-100 ${
                          index === selectedGenreIndex ? 'bg-brand-100 dark:bg-brand-900/40' : ''
                        }`}
                        disabled={loading}
                      >
                        {genre}
                      </button>
                    ))}
                  {filteredGenreOptions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No genres found</div>
                  )}
                </div>
            )}
          </div>
          {currentGenres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {currentGenres.map(genre => (
                <RemovableChip key={genre} label={genre} onRemove={() => onToggleGenre(genre)} disabled={loading} />
              ))}
            </div>
          )}
        </div>
        <div>
          <label htmlFor="song-album" className="label-base">Album</label>
          <AutocompleteInput
            id="song-album"
            name="album"
            value={typeof form.album === 'string' ? form.album : ''}
            onValueChange={(v) => onChange({ target: { name: 'album', value: v } } as React.ChangeEvent<HTMLInputElement>)}
            suggestions={suggestedAlbums}
            inputClassName="input-base"
            wrapperClassName="relative z-[25]"
            disabled={loading}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="language-search" className="label-base">Languages</label>
          <div className="relative z-20">
            <input
              id="language-search"
              type="text"
              placeholder="Search or select a language"
              value={languageSearchQuery}
              onChange={(e) => { setLanguageSearchQuery(e.target.value); setSelectedLanguageIndex(-1); }}
              onFocus={() => setLanguageSearchOpen(true)}
              onBlur={() => setTimeout(() => setLanguageSearchOpen(false), 200)}
              onKeyDown={(e) => handleComboKeyDown(
                e, filteredLanguageOptions, selectedLanguageIndex, setSelectedLanguageIndex, setLanguageSearchOpen,
                (language) => { onToggleLanguage(language); setLanguageSearchQuery(''); setLanguageSearchOpen(false); setSelectedLanguageIndex(-1); },
              )}
              className="input-base"
              disabled={loading}
              {...comboboxInputAria('song-languages-list', languageSearchOpen, selectedLanguageIndex)}
            />
            {languageSearchOpen && (
                <div ref={languageListRef} id="song-languages-list" role="listbox" className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-32 overflow-y-auto">
                  {filteredLanguageOptions.map((language, index) => (
                      <button
                        key={language}
                        type="button"
                        {...comboboxOptionAria('song-languages-list', index, selectedLanguageIndex)}
                        onMouseEnter={() => setSelectedLanguageIndex(index)}
                        onClick={() => {
                          onToggleLanguage(language);
                          setLanguageSearchQuery('');
                          setLanguageSearchOpen(false);
                          setSelectedLanguageIndex(-1);
                        }}
                        className={`w-full text-left px-3 py-2 text-gray-700 dark:text-gray-100 ${
                          index === selectedLanguageIndex ? 'bg-brand-100 dark:bg-brand-900/40' : ''
                        }`}
                        disabled={loading}
                      >
                        {language}
                      </button>
                    ))}
                  {filteredLanguageOptions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No languages found</div>
                  )}
                </div>
            )}
          </div>
          {currentLanguages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {currentLanguages.map(language => (
                <RemovableChip key={language} label={language} onRemove={() => onToggleLanguage(language)} disabled={loading} />
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="song-duration" className="label-base">Duration (m:ss)</label>
            <input
              id="song-duration"
              className={`input-base ${durationError ? 'border-red-500 focus:border-red-500 dark:border-red-500 dark:focus:border-red-500' : ''}`}
              name="durationSeconds"
              type="text"
              inputMode="numeric"
              value={durationText}
              aria-invalid={durationError ? true : undefined}
              aria-describedby={durationError ? 'song-duration-error' : undefined}
              onChange={(e) => {
                setDurationText(e.target.value);
                if (durationError) setDurationError(null);
              }}
              onBlur={() => {
                const trimmed = durationText.trim();
                if (trimmed === '') {
                  // Cleared on purpose — no error, commit "no duration".
                  setDurationError(null);
                  setDurationText('');
                  lastCommittedSeconds.current = null;
                  onSetDurationSeconds?.(null);
                  return;
                }
                const seconds = parseDurationToSeconds(durationText);
                if (seconds === null) {
                  // Keep what the user typed and tell them what's wrong.
                  setDurationError('Use m:ss (e.g. 3:30) or whole minutes; seconds must be 0–59.');
                  return;
                }
                setDurationError(null);
                setDurationText(formatSecondsToMmss(seconds)); // canonicalise (3:3 → 3:30)
                lastCommittedSeconds.current = seconds;
                onSetDurationSeconds?.(seconds);
              }}
              disabled={loading}
            />
            {durationError && (
              <p id="song-duration-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{durationError}</p>
            )}
          </div>
          <div>
            <label htmlFor="song-bpm" className="label-base">BPM</label>
            <input
              id="song-bpm"
              className="input-base"
              name="bpm"
              type="number"
              value={form.bpm ?? ''}
              onChange={onChange}
              min={0}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="song-time-signature" className="label-base">Time Signature</label>
            <select
              id="song-time-signature"
              className="input-base"
              name="timeSignature"
              value={form.timeSignature || ''}
              onChange={onChange}
              disabled={loading}
            >
              <option value="">Select a time signature</option>
              {timeSignatureOptions.map(ts => (
                <option key={ts} value={ts}>{ts}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="song-key" className="label-base">Key</label>
            <select
              id="song-key"
              className="input-base"
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
            <label htmlFor="song-mode" className="label-base">Mode</label>
            <select
              id="song-mode"
              className="input-base"
              name="mode"
              value={form.mode || ''}
              onChange={onChange}
              disabled={loading}
            >
              <option value="">Select a mode</option>
              {modeOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="song-pitch-standard" className="label-base">Pitch Standard (Hz)</label>
            <input
              id="song-pitch-standard"
              className="input-base"
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
      </Disclosure>
      <StreamingLinksEditor
        links={form.streamingLinks || []}
        onChange={(links) => onSetStreamingLinks?.(links)}
        disabled={loading}
      />
      <div>
        <span className="label-base">Instruments</span>
        <SongFormInstruments
          currentInstruments={currentInstruments}
          capo={form.capo ?? null}
          instrumentDifficulty={form.instrumentDifficulty || {}}
          instrumentTuning={form.instrumentTuning || {}}
          currentTechniques={currentTechniques}
          instrumentLinks={form.instrumentLinks || null}
          myInstrumentUid={form.myInstrumentUid}
          onChangeInstruments={onChangeInstruments}
          onSetInstrumentDifficulty={onSetInstrumentDifficulty}
          onSetCapo={(capo) => {
            onChange({
              target: {
                name: 'capo',
                value: capo === null ? '' : String(capo),
              },
            } as React.ChangeEvent<HTMLInputElement>);
          }}
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
          <label htmlFor="add-instrument" className="label-base">Add an instrument</label>
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
            className="input-base"
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
        <label htmlFor="song-notes" className="label-base">Notes</label>
        <textarea
          id="song-notes"
          className="input-base"
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
              className="btn-danger"
              onClick={onDelete}
              disabled={loading}
            >
              Delete
            </button>
          )}
        </div>
        {/* Story 13.1 + 17.2: both add and edit auto-save — no Save/Cancel/Add
            button here; the sticky "Back to songlist" header handles leaving. In
            add mode the song is created at the debounce, then the panel switches
            to edit mode invisibly. */}
      </div>
    </form>
  );
}
