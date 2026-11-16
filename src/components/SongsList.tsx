import { Link } from 'react-router-dom';
import { isRealInstrument } from '../utils/songFilters';
import type { Song } from '../services/songService';
import { PlaylistsLoadMessage, type PlaylistsLoadStatus } from './PlaylistsLoadMessage';
import type { ReactNode } from 'react';
import SongsSidebar from './SongsSidebar';
import FiltersDisclosureButton from './FiltersDisclosureButton';
import { BulkActionBar } from './BulkActionBar';
import { RowSelectionCheckbox, SelectAllCheckbox } from './SelectionCheckbox';
import { selectionCell } from '../utils/selectionCell';
import { useDismissablePanel } from '../hooks/useDismissablePanel';
import { CloseButton } from './CloseButton';
import { Page } from './Page';
import { Panel } from './Panel';
import { EmptyState } from './EmptyState';
import { ListSkeleton } from './ListSkeleton';
import SonglistCatalogSuggestions from './SonglistCatalogSuggestions';
import { findExistingIn } from '../hooks/useSonglistMatcher';

export interface SongsListProps {
  // State
  songs: Song[];
  filteredSongs: Song[];
  displayedSongs: Song[];
  loading: boolean;
  
  // Search & filters
  searchQuery: string;
  // #191: a song added from the Catalog suggestions of an empty search.
  onAddedFromCatalog: (song: Song) => void;
  instrumentFilter: string;
  myInstrumentFilter: string;
  instrumentDifficultyFilter: number | '';
  capoFilter: number | '';
  tuningFilter: string;
  technicianFilters: Set<string>;
  techniqueMatchMode: 'all' | 'any';
  genreFilters: Set<string>;
  genreMatchMode: 'all' | 'any';
  keyFilter: string;
  bpmMinFilter: string;
  bpmMaxFilter: string;
  pitchStandardMinFilter: string;
  pitchStandardMaxFilter: string;
  playlistFilter: string;
  timeSignatureFilter: string;
  modeFilter: string;
  languageFilters: Set<string>;
  languageMatchMode: 'all' | 'any';
  languageFilterOptions: string[];
  selectedSongs: Set<string>;
  
  // UI state
  sidebarExpanded: boolean;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (o: boolean) => void;
  filtersAccordionOpen: boolean;
  playlistAccordionOpen: boolean;
  tuningAccordionOpen: boolean;
  difficultyAccordionOpen: boolean;
  capoAccordionOpen: boolean;
  techniqueAccordionOpen: boolean;
  genreAccordionOpen: boolean;
  keyAccordionOpen: boolean;
  bpmAccordionOpen: boolean;
  pitchAccordionOpen: boolean;
  timeSignatureAccordionOpen: boolean;
  modeAccordionOpen: boolean;
  languageAccordionOpen: boolean;
  bulkPlaylistOpen: boolean;
  
  // Data
  playlists: Array<{ uid: string; name: string; songUids?: string[] }>;
  playlistsLoadStatus: PlaylistsLoadStatus;
  /** #71: the bulk Set instrument action, owned by the page. */
  bulkSetInstrument?: ReactNode;
  onRetryPlaylists: () => void;
  myInstruments: Array<{ uid: string; type?: string; name: string }>;
  instrumentTypeOptions: string[];
  tuningFilterOptions: Array<{ value: string; label: string }>;
  genreOptions: string[];
  availableTechniqueFilters: string[];
  allDisplayedSelected: boolean;
  someDisplayedSelected: boolean;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  showTuningFilters: boolean;
  bulkPlaylistSelection: Set<string>;
  
  // Handlers
  setSearchQuery: (q: string) => void;
  setInstrumentFilter: (f: string) => void;
  setMyInstrumentFilter: (f: string) => void;
  setInstrumentDifficultyFilter: (f: number | '') => void;
  setCapoFilter: (f: number | '') => void;
  setTuningFilter: (f: string) => void;
  toggleTechniqueFilter: (t: string) => void;
  setTechniqueMatchMode: (m: 'all' | 'any') => void;
  toggleGenreFilter: (g: string) => void;
  setGenreMatchMode: (m: 'all' | 'any') => void;
  setKeyFilter: (f: string) => void;
  setBpmMinFilter: (v: string) => void;
  setBpmMaxFilter: (v: string) => void;
  setPitchStandardMinFilter: (v: string) => void;
  setPitchStandardMaxFilter: (v: string) => void;
  setPlaylistFilter: (f: string) => void;
  setTimeSignatureFilter: (f: string) => void;
  setModeFilter: (f: string) => void;
  toggleLanguageFilter: (l: string) => void;
  setLanguageMatchMode: (m: 'all' | 'any') => void;
  setLanguageAccordionOpen: (o: boolean) => void;
  setSidebarExpanded: (e: boolean) => void;
  setFiltersAccordionOpen: (o: boolean) => void;
  setPlaylistAccordionOpen: (o: boolean) => void;
  setTuningAccordionOpen: (o: boolean) => void;
  setDifficultyAccordionOpen: (o: boolean) => void;
  setCapoAccordionOpen: (o: boolean) => void;
  setTechniqueAccordionOpen: (o: boolean) => void;
  setGenreAccordionOpen: (o: boolean) => void;
  setKeyAccordionOpen: (o: boolean) => void;
  setBpmAccordionOpen: (o: boolean) => void;
  setPitchAccordionOpen: (o: boolean) => void;
  setTimeSignatureAccordionOpen: (o: boolean) => void;
  setModeAccordionOpen: (o: boolean) => void;
  toggleBulkPlaylistPicker: () => void;
  closeBulkPlaylistPicker: () => void;
  toggleSelectSong: (uid: string) => void;
  toggleSelectAll: () => void;
  toggleBulkPlaylistSelection: (uid: string) => void;
  handleApplySelectedToPlaylists: () => void;
  handleMarkSelectedAsPlayedNow: () => void;
  handleDeleteSelected: () => void;
  clearAllFilters: () => void;
  
  // Callbacks
  onEdit: (song: Song) => void;
  onAddNew: () => void;
  // #192: open the add form with this title prefilled (from an empty search).
  onAddNewWithTitle: (title: string) => void;
  
  // Additional handlers
  getLastPlayedForSong: (uid: string) => string | undefined;
  formatLastPlayed: (date: string | undefined) => string;
  SortHeader: (props: { column: string; label: string; align?: 'left' | 'right' }) => ReactNode;
}

export default function SongsList(props: SongsListProps) {
  const trimmedSearch = props.searchQuery.trim(); // #191 / #192: what an empty search offers to find or create
  // The bulk Add to playlist menu closes like its ✕ on an outside click or Escape, and
  // like its ✕ not while the page is loading (#38).
  const playlistMenu = useDismissablePanel({
    open: props.bulkPlaylistOpen,
    onClose: props.closeBulkPlaylistPicker,
    blocked: props.loading,
  });
  return (
    <Page
      width="wide"
      title="Songlist"
      description="Manage your songs, filters, and playlists."
      actions={(
        <button
          type="button"
          className="btn-primary"
          onClick={props.onAddNew}
          disabled={props.loading}
        >
          Add a song
        </button>
      )}
      className="space-y-6"
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <FiltersDisclosureButton
          open={props.mobileFiltersOpen}
          onToggle={() => props.setMobileFiltersOpen(!props.mobileFiltersOpen)}
          activeFilterCount={props.activeFilterCount}
        />
        <SongsSidebar
          mobileFiltersOpen={props.mobileFiltersOpen}
          sidebarExpanded={props.sidebarExpanded}
          setSidebarExpanded={props.setSidebarExpanded}
          filtersAccordionOpen={props.filtersAccordionOpen}
          setFiltersAccordionOpen={props.setFiltersAccordionOpen}
          playlistAccordionOpen={props.playlistAccordionOpen}
          setPlaylistAccordionOpen={props.setPlaylistAccordionOpen}
          tuningAccordionOpen={props.tuningAccordionOpen}
          setTuningAccordionOpen={props.setTuningAccordionOpen}
          difficultyAccordionOpen={props.difficultyAccordionOpen}
          setDifficultyAccordionOpen={props.setDifficultyAccordionOpen}
          capoAccordionOpen={props.capoAccordionOpen}
          setCapoAccordionOpen={props.setCapoAccordionOpen}
          techniqueAccordionOpen={props.techniqueAccordionOpen}
          setTechniqueAccordionOpen={props.setTechniqueAccordionOpen}
          genreAccordionOpen={props.genreAccordionOpen}
          setGenreAccordionOpen={props.setGenreAccordionOpen}
          keyAccordionOpen={props.keyAccordionOpen}
          setKeyAccordionOpen={props.setKeyAccordionOpen}
          bpmAccordionOpen={props.bpmAccordionOpen}
          setBpmAccordionOpen={props.setBpmAccordionOpen}
          pitchAccordionOpen={props.pitchAccordionOpen}
          setPitchAccordionOpen={props.setPitchAccordionOpen}
          timeSignatureAccordionOpen={props.timeSignatureAccordionOpen}
          setTimeSignatureAccordionOpen={props.setTimeSignatureAccordionOpen}
          modeAccordionOpen={props.modeAccordionOpen}
          setModeAccordionOpen={props.setModeAccordionOpen}
          instrumentFilter={props.instrumentFilter}
          myInstrumentFilter={props.myInstrumentFilter}
          instrumentDifficultyFilter={props.instrumentDifficultyFilter}
          capoFilter={props.capoFilter}
          tuningFilter={props.tuningFilter}
          technicianFilters={props.technicianFilters}
          techniqueMatchMode={props.techniqueMatchMode}
          genreFilters={props.genreFilters}
          genreMatchMode={props.genreMatchMode}
          keyFilter={props.keyFilter}
          bpmMinFilter={props.bpmMinFilter}
          bpmMaxFilter={props.bpmMaxFilter}
          pitchStandardMinFilter={props.pitchStandardMinFilter}
          pitchStandardMaxFilter={props.pitchStandardMaxFilter}
          playlistFilter={props.playlistFilter}
          timeSignatureFilter={props.timeSignatureFilter}
          modeFilter={props.modeFilter}
          languageFilters={props.languageFilters}
          languageMatchMode={props.languageMatchMode}
          languageAccordionOpen={props.languageAccordionOpen}
          languageFilterOptions={props.languageFilterOptions}
          setInstrumentFilter={props.setInstrumentFilter}
          setMyInstrumentFilter={props.setMyInstrumentFilter}
          setInstrumentDifficultyFilter={props.setInstrumentDifficultyFilter}
          setCapoFilter={props.setCapoFilter}
          setTuningFilter={props.setTuningFilter}
          toggleTechniqueFilter={props.toggleTechniqueFilter}
          setTechniqueMatchMode={props.setTechniqueMatchMode}
          toggleGenreFilter={props.toggleGenreFilter}
          setGenreMatchMode={props.setGenreMatchMode}
          setKeyFilter={props.setKeyFilter}
          setBpmMinFilter={props.setBpmMinFilter}
          setBpmMaxFilter={props.setBpmMaxFilter}
          setPitchStandardMinFilter={props.setPitchStandardMinFilter}
          setPitchStandardMaxFilter={props.setPitchStandardMaxFilter}
          setPlaylistFilter={props.setPlaylistFilter}
          setTimeSignatureFilter={props.setTimeSignatureFilter}
          setModeFilter={props.setModeFilter}
          toggleLanguageFilter={props.toggleLanguageFilter}
          setLanguageMatchMode={props.setLanguageMatchMode}
          setLanguageAccordionOpen={props.setLanguageAccordionOpen}
          playlists={props.playlists}
          myInstruments={props.myInstruments}
          instrumentTypeOptions={props.instrumentTypeOptions}
          tuningFilterOptions={props.tuningFilterOptions}
          genreOptions={props.genreOptions}
          availableTechniqueFilters={props.availableTechniqueFilters}
          hasActiveFilters={props.hasActiveFilters}
          showTuningFilters={props.showTuningFilters}
          clearAllFilters={props.clearAllFilters}
        />
        <div className="w-full lg:flex-1 min-w-0 space-y-4">
          <div className="card-base glass-effect p-4 sm:p-5">
            <div>
              <label htmlFor="songs-search" className="label-base">
                Search
              </label>
              <div className="relative">
              <input
                id="songs-search"
                type="text"
                placeholder="Search by title, artist, or album…"
                value={props.searchQuery}
                onChange={e => props.setSearchQuery(e.target.value)}
                className="input-base pr-10"
              />
              {props.searchQuery && (
                <CloseButton label="Clear search" onClick={() => props.setSearchQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2" />
              )}
              </div>
            </div>
          </div>
          {/* Bulk actions: the shared bar (22.1) hides itself when nothing is selected. */}
          <BulkActionBar count={props.selectedSongs.size} noun="song(s)">
            {props.bulkSetInstrument}
            <div className="relative">
              <button
                ref={playlistMenu.buttonRef}
                type="button"
                className="btn-primary btn-sm"
                onClick={props.toggleBulkPlaylistPicker}
                disabled={props.loading}
                aria-expanded={props.bulkPlaylistOpen}
                aria-controls={playlistMenu.panelId}
              >
                Add to playlist
              </button>
              {props.bulkPlaylistOpen && (
                <Panel panel={playlistMenu} title="Select playlists" onClose={props.closeBulkPlaylistPicker} closeDisabled={props.loading}>
                  {props.playlists.length === 0 && props.playlistsLoadStatus !== 'loaded' ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <PlaylistsLoadMessage status={props.playlistsLoadStatus} onRetry={props.onRetryPlaylists} />
                    </p>
                  ) : props.playlists.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No playlists yet.{' '}
                      <Link to="/my-playlists" className="text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300">Create one</Link>
                    </p>
                  ) : (
                    <>
                      <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
                        {props.playlists.map(pl => (
                          <label
                            key={pl.uid}
                            className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={props.bulkPlaylistSelection.has(pl.uid)}
                              onChange={() => props.toggleBulkPlaylistSelection(pl.uid)}
                              className="rounded border-gray-300 accent-brand-500 dark:accent-brand-400"
                            />
                            <span className="text-sm text-gray-900 dark:text-gray-100">{pl.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{(pl.songUids || []).length}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={props.closeBulkPlaylistPicker}
                          disabled={props.loading}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={props.handleApplySelectedToPlaylists}
                          disabled={props.bulkPlaylistSelection.size === 0 || props.loading}
                        >
                          Add
                        </button>
                      </div>
                    </>
                  )}
                </Panel>
              )}
            </div>
            {/* #98: a real instrument only, as with no filter: a play with no instrument feeds no session. */}
            {isRealInstrument(props.instrumentFilter) && (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={props.handleMarkSelectedAsPlayedNow}
                disabled={props.loading}
              >
                {`Mark as played on ${props.instrumentFilter}`}
              </button>
            )}
            <button
              type="button"
              className="btn-danger btn-sm"
              onClick={props.handleDeleteSelected}
              disabled={props.loading}
            >
              Delete selected
            </button>
          </BulkActionBar>
          {props.loading ? (
            <ListSkeleton rows={6} label="Loading…" />
          ) : props.filteredSongs.length === 0 ? (
            <div className="card-base">
              <EmptyState
                action={props.activeFilterCount > 0 && (
                  <button type="button" className="btn-link" onClick={props.clearAllFilters}>Clear filters</button>
                )}
              >
                {emptyListMessage(props.activeFilterCount > 0, props.searchQuery !== '')}
              </EmptyState>
              {props.songs.length > 0 && trimmedSearch.length >= 2 && (
                <div className="px-4 pb-4">
                  <SonglistCatalogSuggestions
                    search={trimmedSearch}
                    findExisting={entry => findExistingIn(props.songs, entry)}
                    onAdded={props.onAddedFromCatalog}
                    preferredInstrument={isRealInstrument(props.instrumentFilter) ? props.instrumentFilter : undefined}
                  />
                  <button type="button" className="btn-link mt-4" onClick={() => props.onAddNewWithTitle(trimmedSearch)}>
                    Add "{trimmedSearch}" as a new song
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card-base overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm">
                    <tr>
                      <th className={selectionCell('text-center p-2 border-b dark:border-gray-700 w-12')}>
                        <SelectAllCheckbox
                          allSelected={props.allDisplayedSelected}
                          someSelected={props.someDisplayedSelected}
                          onToggle={props.toggleSelectAll}
                          disabled={props.loading}
                        />
                      </th>
                      <props.SortHeader column="artist" label="Artist" />
                      <props.SortHeader column="title" label="Title" />
                      <props.SortHeader column="lastPlayed" label="Last played" align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {props.displayedSongs.map(song => (
                      <tr
                        key={song.uid}
                        className={`border-b dark:border-gray-700 cursor-pointer ${props.selectedSongs.has(song.uid) ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        // Row click opens the song (its edit form); selection is
                        // reserved to the checkbox, which stops propagation below
                        onClick={() => props.onEdit(song)}
                      >
                        <td className={selectionCell('p-2 text-center w-12')}>
                          <RowSelectionCheckbox
                            checked={props.selectedSongs.has(song.uid)}
                            onChange={() => props.toggleSelectSong(song.uid)}
                            label={song.artist ? `${song.title} by ${song.artist}` : song.title}
                            disabled={props.loading}
                          />
                        </td>
                        <td className="p-2 align-middle max-w-xs truncate" title={song.artist}>{song.artist}</td>
                        <td className="p-2 align-middle max-w-sm truncate" title={song.title}>{song.title}</td>
                        <td className="p-2 pr-4 align-middle text-right whitespace-nowrap w-px">
                          {props.instrumentFilter ? props.formatLastPlayed(props.getLastPlayedForSong(song.uid)) : 'Select instrument'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

// #98: why the list is empty, with a way out of filters (the sidebar may be collapsed). A
// songlist with no song at all gets the page's own empty screen, not this list.
function emptyListMessage(hasActiveFilters: boolean, hasSearch: boolean): string {
  if (hasActiveFilters) return 'No songs match your filters.';
  if (hasSearch) return 'No songs match your search.';
  return 'No songs saved.';
}
