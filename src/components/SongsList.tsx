import React from 'react';
import type { Song } from '../services/songService';

type SongsListProps = {
  songs: Song[];
  loading: boolean;
  selectedSongs: Set<string>;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  sidebarExpanded: boolean;
  // Filters
  searchQuery: string;
  instrumentFilter: string;
  myInstrumentFilter: string;
  instrumentDifficultyFilter: number | null;
  tuningFilter: string;
  keyFilter: string;
  bpmMinFilter: string;
  bpmMaxFilter: string;
  pitchStandardMinFilter: string;
  pitchStandardMaxFilter: string;
  playlistFilter: string;
  genreFilters: Set<string>;
  techniqueFilters: Set<string>;
  instrumentMatchMode: 'any' | 'all';
  hasActiveFilters: boolean;
  filteredAndSortedSongs: Song[];
  songPlays: Map<string, any>;
  // Handlers
  onToggleSelectSong: (uid: string) => void;
  onToggleSelectAll: () => void;
  onSortClick: (column: string) => void;
  onToggleSidebar: () => void;
  onEdit: (song: Song) => void;
  onDelete: (uid: string) => void;
  onMarkSelectedAsPlayedNow: () => void;
  onToggleBulkPlaylist: () => void;
  bulkPlaylistOpen: boolean;
  bulkPlaylistSelection: Set<string>;
  onToggleBulkPlaylistSelection: (uid: string) => void;
  onApplySelectedToPlaylists: () => void;
  playlists: any[];
  // Others
  myInstruments: any[];
  instrumentTypeOptions: any[];
  formatLastPlayed: (date: string | undefined) => string;
  getLastPlayedForSong: (uid: string) => string | undefined;
};

export function SongsList(props: SongsListProps) {
  const {
    songs,
    loading,
    selectedSongs,
    sortColumn,
    sortDirection,
    sidebarExpanded,
    searchQuery,
    instrumentFilter,
    myInstrumentFilter,
    instrumentDifficultyFilter,
    tuningFilter,
    keyFilter,
    bpmMinFilter,
    bpmMaxFilter,
    pitchStandardMinFilter,
    pitchStandardMaxFilter,
    playlistFilter,
    genreFilters,
    techniqueFilters,
    instrumentMatchMode,
    hasActiveFilters,
    filteredAndSortedSongs,
    songPlays,
    onToggleSelectSong,
    onToggleSelectAll,
    onSortClick,
    onToggleSidebar,
    onEdit,
    onDelete,
    onMarkSelectedAsPlayedNow,
    onToggleBulkPlaylist,
    bulkPlaylistOpen,
    bulkPlaylistSelection,
    onToggleBulkPlaylistSelection,
    onApplySelectedToPlaylists,
    playlists,
    myInstruments,
    instrumentTypeOptions,
    formatLastPlayed,
    getLastPlayedForSong,
  } = props;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <p>SongsList component - TODO: Extract list UI here</p>
    </div>
  );
}
