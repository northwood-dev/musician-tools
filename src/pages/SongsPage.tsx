import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SongForm } from '../components/SongForm';
import { songService, type CreateSongDTO, type Song } from '../services/songService';
import { instrumentService, type Instrument } from '../services/instrumentService';
import { songPlayService, type SongPlay } from '../services/songPlayService';
import { playlistService, type Playlist } from '../services/playlistService';
import { toSlug } from '../utils/slug';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { instrumentTechniquesMap, instrumentTuningsMap, instrumentTypeOptions } from '../constants/instrumentTypes';

const genreOptions = [
  'Acoustic','Alternative','Ambient','Blues','Classical','Country','Disco','Drum & Bass','EDM','Electronic','Folk','Funk','Gospel','Hard Rock','Hip-Hop','House','Indie','Jazz','K-Pop','Latin','Metal','Pop','Progressive','Punk','R&B / Soul','Rap','Reggae','Rock','Singer-Songwriter','Ska','Soundtrack','Techno','Trap','World','Other'
];

const initialSong: CreateSongDTO = {
  title: '',
  bpm: null,
  key: '',
  notes: '',
  instrument: [],
  instrumentDifficulty: {},
  instrumentTuning: {},
  artist: '',
  album: '',
  genre: [],
  technique: [],
  pitchStandard: 440,
  lastPlayed: undefined,
};

function SongsPage() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<Song[]>([]);
  const [form, setForm] = useState<CreateSongDTO>(initialSong);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  // Removed unused sortByLastPlayed
  const [sortColumn, setSortColumn] = useState<string | null>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsSortColumn') : null;
    return saved ? saved : null;
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsSortDirection') : null;
    return saved === 'desc' ? 'desc' : 'asc';
  });
  const [genreFilters, setGenreFilters] = useState<Set<string>>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsGenreFilters') : null;
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [genreMatchMode, setGenreMatchMode] = useState<'any' | 'all'>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsGenreMatchMode') : null;
    return saved === 'any' ? 'any' : 'all';
  });
  const [page, setPage] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsSelectedUids') : null;
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [bulkPlaylistOpen, setBulkPlaylistOpen] = useState(false);
  const [bulkPlaylistSelection, setBulkPlaylistSelection] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'multiple' | null>(null);
  const [deleteUid, setDeleteUid] = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsSidebarExpanded') : null;
    return saved === 'false' ? false : true; // default to expanded unless persisted false
  });
  const [instrumentFilter, setInstrumentFilter] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsInstrumentFilter') : null;
    return saved ? saved : '';
  });
  const [instrumentDifficultyFilter, setInstrumentDifficultyFilter] = useState<number | ''>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsInstrumentDifficultyFilter') : null;
    return saved ? Number(saved) : '';
  });
  const [myInstrumentFilter, setMyInstrumentFilter] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsMyInstrumentFilter') : null;
    return saved ? saved : '';
  });
  const [myInstruments, setMyInstruments] = useState<Instrument[]>([]);
  const [instrumentMatchMode, setInstrumentMatchMode] = useState<'any' | 'all'>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsInstrumentMatchMode') : null;
    return saved === 'any' ? 'any' : 'all'; // default to 'all' for exclusive filtering
  });
  const [techniqueFilters, setTechniqueFilters] = useState<Set<string>>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsTechniqueFilters') : null;
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [techniqueMatchMode, setTechniqueMatchMode] = useState<'any' | 'all'>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsTechniqueMatchMode') : null;
    return saved === 'any' ? 'any' : 'all';
  });
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsSearchQuery') : null;
    return saved || '';
  });
  const [tuningFilter, setTuningFilter] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsTuningFilter') : null;
    return saved || '';
  });
  const [keyFilter, setKeyFilter] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsKeyFilter') : null;
    return saved || '';
  });
  const [bpmMinFilter, setBpmMinFilter] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsBpmMinFilter') : null;
    return saved || '';
  });
  const [bpmMaxFilter, setBpmMaxFilter] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsBpmMaxFilter') : null;
    return saved || '';
  });
  const [pitchStandardMinFilter, setPitchStandardMinFilter] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsPitchStandardMinFilter') : null;
    return saved || '';
  });
  const [pitchStandardMaxFilter, setPitchStandardMaxFilter] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsPitchStandardMaxFilter') : null;
    return saved || '';
  });
  const [filtersAccordionOpen, setFiltersAccordionOpen] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsFiltersAccordionOpen') : null;
    return saved === 'false' ? false : true;
  });
  const [tuningAccordionOpen, setTuningAccordionOpen] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsTuningAccordionOpen') : null;
    return saved === 'false' ? false : true;
  });
  const [keyAccordionOpen, setKeyAccordionOpen] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsKeyAccordionOpen') : null;
    return saved === 'false' ? false : true;
  });
  const [techniqueAccordionOpen, setTechniqueAccordionOpen] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsTechniqueAccordionOpen') : null;
    return saved === 'false' ? false : true;
  });
  const [songPlays, setSongPlays] = useState<Map<string, SongPlay[]>>(new Map());
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistFilter, setPlaylistFilter] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsPlaylistFilter') : null;
    return saved ? saved : '';
  });
  const [playlistAccordionOpen, setPlaylistAccordionOpen] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsPlaylistAccordionOpen') : null;
    return saved === 'false' ? false : true;
  });
  const [genreAccordionOpen, setGenreAccordionOpen] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsGenreAccordionOpen') : null;
    return saved === 'false' ? false : true;
  });
  const [bpmAccordionOpen, setBpmAccordionOpen] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsBpmAccordionOpen') : null;
    return saved === 'false' ? false : true;
  });
  const [pitchAccordionOpen, setPitchAccordionOpen] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('songsPitchAccordionOpen') : null;
    return saved === 'false' ? false : true;
  });
  // Removed unused user, logout from useAuth

  const hasActiveFilters = Boolean(
    instrumentFilter ||
    myInstrumentFilter ||
    instrumentDifficultyFilter ||
    tuningFilter ||
    keyFilter ||
    bpmMinFilter ||
    bpmMaxFilter ||
    pitchStandardMinFilter ||
    pitchStandardMaxFilter ||
    playlistFilter ||
    techniqueFilters.size > 0 ||
    genreFilters.size > 0
  );

  const clearAllFilters = () => {
    setInstrumentFilter('');
    setMyInstrumentFilter('');
    setInstrumentDifficultyFilter('');
    setInstrumentMatchMode('all');
    setTechniqueFilters(new Set());
    setTechniqueMatchMode('all');
    setGenreFilters(new Set());
    setGenreMatchMode('all');
    setTuningFilter('');
    setKeyFilter('');
    setBpmMinFilter('');
    setBpmMaxFilter('');
    setPitchStandardMinFilter('');
    setPitchStandardMaxFilter('');
    setPlaylistFilter('');
  };



  const toggleTechniqueFilter = (technique: string) => {
    setTechniqueFilters(prev => {
      const next = new Set(prev);
      if (next.has(technique)) next.delete(technique);
      else next.add(technique);
      return next;
    });
  };

  const toggleGenreFilter = (genre: string) => {
    setGenreFilters(prev => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  };




  useEffect(() => {
    const loadSongs = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await songService.getAllSongs();
        setSongs(data);
        // Charger les plays pour toutes les chansons
        const playsMap = new Map<string, SongPlay[]>();
        await Promise.all(
          data.map(async (song) => {
            try {
              const plays = await songPlayService.getPlays(song.uid);
              playsMap.set(song.uid, plays);
            } catch (err) {
              console.error(`Failed to load plays for ${song.uid}:`, err);
              playsMap.set(song.uid, []);
            }
          })
        );
        setSongPlays(playsMap);
      } catch (err) {
        setError('Error while loading songs');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    const loadPlaylists = async () => {
      try {
        const list = await playlistService.getAllPlaylists();
        setPlaylists(list);
      } catch (err) {
        console.error('Error loading playlists:', err);
      }
    };
    loadSongs();
    loadPlaylists();
    (async () => {
      try {
        const list = await instrumentService.getAll();
        setMyInstruments(list);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsSidebarExpanded', sidebarExpanded ? 'true' : 'false');
    } catch { /* ignore */ }
  }, [sidebarExpanded]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsInstrumentMatchMode', instrumentMatchMode);
    } catch { /* ignore */ }
  }, [instrumentMatchMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsInstrumentFilter', instrumentFilter);
    } catch { /* ignore */ }
  }, [instrumentFilter]);

  useEffect(() => {
    try {
      if (instrumentDifficultyFilter === '') {
        window.localStorage.removeItem('songsInstrumentDifficultyFilter');
      } else {
        window.localStorage.setItem('songsInstrumentDifficultyFilter', String(instrumentDifficultyFilter));
      }
    } catch { /* ignore */ }
  }, [instrumentDifficultyFilter]);

  useEffect(() => {
    if (!instrumentFilter) {
      setTechniqueFilters(new Set());
      setTuningFilter('');
      return;
    }

    const allowedTechniques = new Set(instrumentTechniquesMap[instrumentFilter] || []);
    setTechniqueFilters(prev => {
      const next = new Set(Array.from(prev).filter(t => allowedTechniques.has(t)));
      const isSame = next.size === prev.size && Array.from(next).every(t => prev.has(t));
      return isSame ? prev : next;
    });

    const allowedTunings = new Set((instrumentTuningsMap[instrumentFilter] || []).map(t => t.value));
    setTuningFilter(prev => (prev && !allowedTunings.has(prev) ? '' : prev));
  }, [instrumentFilter]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsMyInstrumentFilter', myInstrumentFilter);
    } catch { /* ignore */ }
  }, [myInstrumentFilter]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsFiltersAccordionOpen', filtersAccordionOpen ? 'true' : 'false');
    } catch { /* ignore */ }
  }, [filtersAccordionOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsTuningAccordionOpen', tuningAccordionOpen ? 'true' : 'false');
    } catch { /* ignore */ }
  }, [tuningAccordionOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsKeyAccordionOpen', keyAccordionOpen ? 'true' : 'false');
    } catch { /* ignore */ }
  }, [keyAccordionOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsBpmAccordionOpen', bpmAccordionOpen ? 'true' : 'false');
    } catch { /* ignore */ }
  }, [bpmAccordionOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsPitchAccordionOpen', pitchAccordionOpen ? 'true' : 'false');
    } catch { /* ignore */ }
  }, [pitchAccordionOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsTechniqueFilters', JSON.stringify(Array.from(techniqueFilters)));
    } catch { /* ignore */ }
  }, [techniqueFilters]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsTechniqueMatchMode', techniqueMatchMode);
    } catch { /* ignore */ }
  }, [techniqueMatchMode]);

    useEffect(() => {
      try {
        window.localStorage.setItem('songsGenreFilters', JSON.stringify(Array.from(genreFilters)));
      } catch { /* ignore */ }
    }, [genreFilters]);

    useEffect(() => {
      try {
        window.localStorage.setItem('songsGenreMatchMode', genreMatchMode);
      } catch { /* ignore */ }
    }, [genreMatchMode]);

    useEffect(() => {
      try {
        window.localStorage.setItem('songsGenreAccordionOpen', genreAccordionOpen ? 'true' : 'false');
      } catch { /* ignore */ }
    }, [genreAccordionOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsTechniqueAccordionOpen', techniqueAccordionOpen ? 'true' : 'false');
    } catch { /* ignore */ }
  }, [techniqueAccordionOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsSortColumn', sortColumn ?? '');
    } catch { /* ignore */ }
  }, [sortColumn]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsSortDirection', sortDirection);
    } catch { /* ignore */ }
  }, [sortDirection]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsSearchQuery', searchQuery);
    } catch { /* ignore */ }
  }, [searchQuery]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsTuningFilter', tuningFilter);
    } catch { /* ignore */ }
  }, [tuningFilter]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsKeyFilter', keyFilter);
    } catch { /* ignore */ }
  }, [keyFilter]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsBpmMinFilter', bpmMinFilter);
    } catch { /* ignore */ }
  }, [bpmMinFilter]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsBpmMaxFilter', bpmMaxFilter);
    } catch { /* ignore */ }
  }, [bpmMaxFilter]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsPitchStandardMinFilter', pitchStandardMinFilter);
    } catch { /* ignore */ }
  }, [pitchStandardMinFilter]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsPitchStandardMaxFilter', pitchStandardMaxFilter);
    } catch { /* ignore */ }
  }, [pitchStandardMaxFilter]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsPlaylistFilter', playlistFilter);
    } catch { /* ignore */ }
  }, [playlistFilter]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsPlaylistAccordionOpen', playlistAccordionOpen ? 'true' : 'false');
    } catch { /* ignore */ }
  }, [playlistAccordionOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem('songsSelectedUids', JSON.stringify(Array.from(selectedSongs)));
    } catch { /* ignore */ }
  }, [selectedSongs]);




  const handleMarkSelectedAsPlayedNow = async () => {
    try {
      setLoading(true);
      setError(null);
      const now = new Date().toISOString();
      const instrumentTypeForPlay = instrumentFilter || undefined;
      
      const newPlays = await Promise.all(
        Array.from(selectedSongs).map(async uid => {
          const play = await songPlayService.markPlayed(uid, { instrumentType: instrumentTypeForPlay });
          await songService.updateSong(uid, { lastPlayed: now });
          return { songUid: uid, play };
        })
      );
      
      const updatedSongs = songs.map(song =>
        selectedSongs.has(song.uid) ? { ...song, lastPlayed: now } : song
      );
      setSongs(updatedSongs);
      setSongPlays(prev => {
        const next = new Map(prev);
        newPlays.forEach(({ songUid, play }) => {
          const existing = next.get(songUid) || [];
          next.set(songUid, [play, ...existing]);
        });
        return next;
      });
      setSelectedSongs(new Set());
    } catch (err) {
      setError('Error while updating songs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBulkPlaylistSelection = (playlistUid: string) => {
    setBulkPlaylistSelection(prev => {
      const next = new Set(prev);
      if (next.has(playlistUid)) next.delete(playlistUid);
      else next.add(playlistUid);
      return next;
    });
  };

  const handleApplySelectedToPlaylists = async () => {
    if (bulkPlaylistSelection.size === 0 || selectedSongs.size === 0) {
      setBulkPlaylistOpen(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const selectedSongArray = Array.from(selectedSongs);

      // Use addSongToPlaylist to reuse server logic and avoid partial updates
      await Promise.all(
        Array.from(bulkPlaylistSelection).flatMap(playlistUid =>
          selectedSongArray.map(songUid => playlistService.addSongToPlaylist(playlistUid, songUid))
        )
      );

      // Refresh playlists locally so counts reflect the change
      const refreshed = await playlistService.getAllPlaylists();
      setPlaylists(refreshed);

      setBulkPlaylistOpen(false);
      setBulkPlaylistSelection(new Set());
      setToastMessage('Added to playlist');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      setError('Error while adding to playlists');
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

  // Removed unused toggleFormInstrument

  const toggleFormTechnique = (technique: string) => {
    setForm(prevForm => {
      const current = Array.isArray(prevForm.technique) ? prevForm.technique : (prevForm.technique ? [prevForm.technique] : []);
      const updated = current.includes(technique)
        ? current.filter(t => t !== technique)
        : [...current, technique];
      return { ...prevForm, technique: updated };
    });
  };

  const toggleFormGenre = (genre: string) => {
    setForm(prevForm => {
      const current = Array.isArray(prevForm.genre) ? prevForm.genre : (prevForm.genre ? [prevForm.genre] : []);
      const updated = current.includes(genre)
        ? current.filter(g => g !== genre)
        : [...current, genre];
      return { ...prevForm, genre: updated };
    });
  };

  const setFormInstruments = (instruments: string[]) => {
    setForm(prevForm => {
      const nextDifficulty = { ...(prevForm.instrumentDifficulty || {}) } as Record<string, number | null>;
      Object.keys(nextDifficulty).forEach(key => {
        if (!instruments.includes(key)) {
          delete nextDifficulty[key];
        }
      });

      return { ...prevForm, instrument: instruments, instrumentDifficulty: nextDifficulty };
    });
  };

  const setInstrumentDifficulty = (instrumentType: string, difficulty: number | null) => {
    setForm(prevForm => {
      const next = { ...(prevForm.instrumentDifficulty || {}) } as Record<string, number | null>;
      if (difficulty === null || Number.isNaN(difficulty)) {
        delete next[instrumentType];
      } else {
        next[instrumentType] = difficulty;
      }
      return { ...prevForm, instrumentDifficulty: next };
    });
  };

  const setFormMyInstrumentUid = (uid: string | undefined) => {
    setForm(prevForm => ({ ...prevForm, myInstrumentUid: uid }));
  };

  const setFormTechniques = (techniques: string[]) => {
    setForm(prevForm => ({ ...prevForm, technique: techniques }));
  };

  const setInstrumentTuning = (
    instrumentType: string,
    tuning: string | null
  ) => {
    setForm(prev => {
      const next = { ...(prev.instrumentTuning || {}) };
      if (tuning === null || tuning === '') {
        delete next[instrumentType];
      } else {
        next[instrumentType] = tuning;
      }
      return { ...prev, instrumentTuning: next };
    });
  };

  // Removed unused setFormTuning

  const setInstrumentLinksForInstrument = (instrumentType: string, links: Array<{ label?: string; url: string }>) => {
    setForm(prev => ({
      ...prev,
      instrumentLinks: {
        ...(prev.instrumentLinks || {}),
        [instrumentType]: links
      }
    }));
  };

  const setStreamingLinks = (links: Array<{ label: string; url: string }>) => {
    setForm(prev => ({
      ...prev,
      streamingLinks: links
    }));
  };

  // Removed unused handleFetchStreamingLinks

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CreateSongDTO = {
      ...form,
      instrument: form.instrument && form.instrument.length > 0 ? form.instrument : null,
      technique: form.technique && form.technique.length > 0 ? form.technique : [],
      genre: form.genre && form.genre.length > 0 ? form.genre : [],
      myInstrumentUid: form.myInstrumentUid ? form.myInstrumentUid : undefined,
      instrumentDifficulty: form.instrumentDifficulty || {},
      instrumentTuning: form.instrumentTuning || {},
    };

    try {
      setLoading(true);
      setError(null);

      // Vérifier si la chanson existe déjà (en mode add)
      if (editingUid === null) {
        const duplicate = songs.find(
          song => 
            song.artist?.toLowerCase().trim() === form.artist?.toLowerCase().trim() &&
            song.title?.toLowerCase().trim() === form.title?.toLowerCase().trim()
        );
        if (duplicate) {
          setError('This song already exists');
          setLoading(false);
          return;
        }
      }

      if (editingUid !== null) {
        const updatedSong = await songService.updateSong(editingUid, payload);
        setSongs(songs.map(song => (song.uid === editingUid ? updatedSong : song)));
        setEditingUid(null);
      } else {
        const newSong = await songService.createSong(payload);
        setSongs([...songs, newSong]);
      }

      setForm(initialSong);
      setPage('list');
    } catch (err) {
      setError('Error while saving');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // handleEdit supprimé (non utilisé)

  const handleDelete = async (uid: string) => {
    setDeleteDialogOpen(true);
    setDeleteMode('single');
    setDeleteUid(uid);
  };

  const handleConfirmDelete = async (uidToDelete: string) => {
    try {
      setLoading(true);
      setError(null);
      await songService.deleteSong(uidToDelete);
      setSongs(songs.filter(song => song.uid !== uidToDelete));
      setDeleteDialogOpen(false);
      setDeleteUid(null);
      setDeleteMode(null);
    } catch (err) {
      setError('Error while deleting');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    setDeleteDialogOpen(true);
    setDeleteMode('multiple');
  };

  const handleConfirmDeleteSelected = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all(Array.from(selectedSongs).map(uid => songService.deleteSong(uid)));
      
      setSongs(songs.filter(song => !selectedSongs.has(song.uid)));
      setSelectedSongs(new Set());
      setDeleteDialogOpen(false);
      setDeleteMode(null);
    } catch (err) {
      setError('Error while deleting songs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectSong = (uid: string) => {
    setSelectedSongs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) {
        newSet.delete(uid);
      } else {
        newSet.add(uid);
      }
      return newSet;
    });
  };

  const selectAllSongs = () => {
    setSelectedSongs(new Set(displayedSongs.map(song => song.uid)));
  };

  const deselectAllSongs = () => {
    setSelectedSongs(new Set());
  };

  const toggleSelectAll = () => {
    if (displayedSongs.every(song => selectedSongs.has(song.uid))) {
      deselectAllSongs();
    } else {
      selectAllSongs();
    }
  };

  const sortedSongs = songs;

  const filteredSongs = sortedSongs.filter(song => {
    const query = searchQuery.toLowerCase();
    const passesSearch = (
      song.title.toLowerCase().includes(query) ||
      song.artist?.toLowerCase().includes(query) ||
      song.album?.toLowerCase().includes(query)
    );
    const selected = instrumentFilter ? [instrumentFilter] : [];
    const songInstruments = Array.isArray(song.instrument)
      ? song.instrument
      : (song.instrument ? [song.instrument] : []);
    const passesInstrument =
      selected.length === 0 ||
      (instrumentMatchMode === 'all'
        ? selected.every(inst => songInstruments.includes(inst))
        : selected.some(inst => songInstruments.includes(inst)));
    const passesMyInstrument = !myInstrumentFilter || song.myInstrumentUid === myInstrumentFilter;
    const passesTuning = !tuningFilter || (instrumentFilter && song.instrumentTuning && song.instrumentTuning[instrumentFilter] === tuningFilter);
    const songDifficulty = instrumentFilter && song.instrumentDifficulty ? song.instrumentDifficulty[instrumentFilter] : undefined;
    const passesDifficulty = !instrumentDifficultyFilter || (
      instrumentFilter
        ? (songDifficulty !== undefined && songDifficulty !== null && songDifficulty <= instrumentDifficultyFilter)
        : false
    );
    const selectedTech = Array.from(techniqueFilters);
    const songTechniques = Array.isArray(song.technique)
      ? song.technique
      : (song.technique ? [song.technique] : []);
    const passesTechnique =
      selectedTech.length === 0 ||
      (techniqueMatchMode === 'all'
        ? selectedTech.every(t => songTechniques.includes(t))
        : selectedTech.some(t => songTechniques.includes(t)));
    const selectedGenres = Array.from(genreFilters);
    const songGenres = Array.isArray(song.genre)
      ? song.genre
      : (song.genre ? [song.genre] : []);
    const passesGenre =
      selectedGenres.length === 0 ||
      (genreMatchMode === 'all'
        ? selectedGenres.every(g => songGenres.includes(g))
        : selectedGenres.some(g => songGenres.includes(g)));
    const passesKey = !keyFilter || song.key === keyFilter;
    const min = bpmMinFilter ? parseInt(bpmMinFilter, 10) : undefined;
    const max = bpmMaxFilter ? parseInt(bpmMaxFilter, 10) : undefined;
    const bpm = song.bpm;
    const passesBpm = (
      (min === undefined || (typeof bpm === 'number' && bpm >= min)) &&
      (max === undefined || (typeof bpm === 'number' && bpm <= max))
    );
    const pitchMin = pitchStandardMinFilter ? parseInt(pitchStandardMinFilter, 10) : undefined;
    const pitchMax = pitchStandardMaxFilter ? parseInt(pitchStandardMaxFilter, 10) : undefined;
    const pitch = song.pitchStandard;
    const passesPitch = (
      (pitchMin === undefined || (typeof pitch === 'number' && pitch >= pitchMin)) &&
      (pitchMax === undefined || (typeof pitch === 'number' && pitch <= pitchMax))
    );
    const passesPlaylist = !playlistFilter || (playlists.find(p => p.uid === playlistFilter)?.songUids || []).includes(song.uid);
    return passesSearch && passesInstrument && passesMyInstrument && passesTechnique && passesGenre && passesTuning && passesDifficulty && passesKey && passesBpm && passesPitch && passesPlaylist;
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
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

  const getLastPlayedForSong = (songUid: string): string | undefined => {
    const plays = songPlays.get(songUid) || [];
    if (plays.length === 0) return undefined;

    // Si on filtre par type d'instrument, trouver le dernier play pour ce type
    if (instrumentFilter) {
      const instrumentPlays = plays.filter(p => p.instrumentType === instrumentFilter);
      return instrumentPlays.length > 0 ? instrumentPlays[0].playedAt : undefined;
    }

    // Sinon, retourner le dernier play toutes instruments confondus
    return plays[0].playedAt;
  };

  const sortByColumnFunc = (items: Song[]) => {
    if (!sortColumn) return items;

    return [...items].sort((a, b) => {
      // Special handling for lastPlayed to use instrument-filtered times from songPlays
      if (sortColumn === 'lastPlayed') {
        const aLastPlayed = getLastPlayedForSong(a.uid);
        const bLastPlayed = getLastPlayedForSong(b.uid);
        const aTime = aLastPlayed ? new Date(aLastPlayed).getTime() : 0;
        const bTime = bLastPlayed ? new Date(bLastPlayed).getTime() : 0;
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      }

      let aVal = (a as Record<string, unknown>)[sortColumn];
      let bVal = (b as Record<string, unknown>)[sortColumn];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }

      return 0;
    });
  };

  const displayedSongs = sortByColumnFunc(filteredSongs);

  const allDisplayedSelected = displayedSongs.length > 0 && displayedSongs.every(song => selectedSongs.has(song.uid));

  const SortHeader = ({ column, label }: { column: string; label: string }) => (
    <th
      className="text-left p-2 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortColumn === column && (
          <span className="text-sm">{sortDirection === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  );

  const availableTechniqueFilters = instrumentFilter ? instrumentTechniquesMap[instrumentFilter] || [] : [];
  const availableTuningFilters = instrumentFilter ? instrumentTuningsMap[instrumentFilter] || [] : [];
  const tuningFilterOptions = availableTuningFilters.filter(opt => opt.value);
  const showTuningFilters = instrumentFilter && instrumentFilter !== 'Drums';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950 text-gray-900 dark:text-gray-100">
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete song(s)"
        message={deleteMode === 'single' ? 'Are you sure you want to delete this song?' : `Are you sure you want to delete ${selectedSongs.size} song(s)?`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        onConfirm={() => {
          if (deleteMode === 'single' && deleteUid) {
            handleConfirmDelete(deleteUid);
          } else if (deleteMode === 'multiple') {
            handleConfirmDeleteSelected();
          }
        }}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setDeleteMode(null);
          setDeleteUid(null);
        }}
      />

      {error && (
        <div className="mx-4 my-4 rounded-md border border-red-300 bg-red-50 text-red-700 p-3 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {toastMessage}

      {page === 'list' ? (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <aside
                id="songs-sidebar"
                className={`${sidebarExpanded ? 'w-full lg:w-80' : 'w-12 lg:w-12'} shrink-0 min-w-[48px] overflow-hidden transition-all duration-300 card-base glass-effect lg:sticky lg:top-24`}
                aria-hidden={false}
              >
                {/* Collapsed rail shows only toggle button */}
                {!sidebarExpanded ? (
                  <div className="p-2 flex items-center justify-center">
                    <button
                      type="button"
                      className="btn-secondary text-xs px-2 py-1"
                      aria-label="Expand sidebar"
                      onClick={() => setSidebarExpanded(true)}
                    >
                      »
                    </button>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Filters</h3>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            className="btn-secondary text-xs px-2 py-1"
                            onClick={clearAllFilters}
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn-secondary text-xs px-2 py-1"
                        aria-label="Collapse sidebar"
                        onClick={() => setSidebarExpanded(false)}
                      >
                        «
                      </button>
                    </div>
                    <div className="card-base">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-md transition-colors shadow-sm"
                        aria-expanded={filtersAccordionOpen}
                        onClick={() => setFiltersAccordionOpen(prev => !prev)}
                      >
                        <span>Instrument filters</span>
                        <span className="text-xl">{filtersAccordionOpen ? '▾' : '▴'}</span>
                      </button>
                      {filtersAccordionOpen && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                          <div>
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by instrument</div>
                            <select
                              value={instrumentFilter}
                              onChange={(e) => setInstrumentFilter(e.target.value)}
                              className="input-base text-sm"
                            >
                              <option value="">All instruments</option>
                              {instrumentTypeOptions.map(inst => (
                                <option key={inst} value={inst}>{inst}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by my instrument</div>
                            <select
                              value={myInstrumentFilter}
                              onChange={(e) => setMyInstrumentFilter(e.target.value)}
                              className="input-base text-sm"
                            >
                              <option value="">All my instruments</option>
                              {myInstruments.map(mi => (
                                <option key={mi.uid} value={mi.uid}>{mi.type ? `${mi.type} - ${mi.name}` : mi.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="pt-2">
                            <button
                              type="button"
                              className="btn-secondary text-xs"
                              onClick={() => {
                                setInstrumentFilter('');
                                setMyInstrumentFilter('');
                                setInstrumentDifficultyFilter('');
                              }}
                            >
                              Clear filters
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="card-base mt-3">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-md transition-colors shadow-sm"
                        aria-expanded={playlistAccordionOpen}
                        onClick={() => setPlaylistAccordionOpen(prev => !prev)}
                      >
                        <span>Playlist filters</span>
                        <span className="text-xl">{playlistAccordionOpen ? '▾' : '▴'}</span>
                      </button>
                      {playlistAccordionOpen && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by playlist</div>
                          <select
                            className="input-base text-sm"
                            value={playlistFilter}
                            onChange={e => setPlaylistFilter(e.target.value)}
                          >
                            <option value="">All playlists</option>
                            {playlists.map(playlist => (
                              <option key={playlist.uid} value={playlist.uid}>{playlist.name}</option>
                            ))}
                          </select>
                          {playlistFilter && (
                            <div className="pt-1">
                              <button
                                type="button"
                                className="btn-secondary text-xs"
                                onClick={() => setPlaylistFilter('')}
                              >
                                Clear filter
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="card-base mt-3">
                      <div className="p-4">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by difficulty (max)</div>
                        <select
                          value={instrumentDifficultyFilter === '' ? '' : instrumentDifficultyFilter}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setInstrumentDifficultyFilter(val as number | '');
                          }}
                          className="input-base text-sm"
                          disabled={!instrumentFilter}
                        >
                          <option value="">All difficulties</option>
                          {[1,2,3,4,5].map(n => (
                            <option key={n} value={n}>{`Up to ${n} ★`}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {showTuningFilters && (
                      <div className="card-base mt-3">
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-md transition-colors shadow-sm"
                          aria-expanded={tuningAccordionOpen}
                          onClick={() => setTuningAccordionOpen(prev => !prev)}
                        >
                          <span>Tuning filters</span>
                          <span className="text-xl">{tuningAccordionOpen ? '▾' : '▴'}</span>
                        </button>
                        {tuningAccordionOpen && (
                          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by tuning</div>
                            {tuningFilterOptions.length === 0 ? (
                              <p className="text-sm text-gray-600 dark:text-gray-400">No tunings available for {instrumentFilter}.</p>
                            ) : (
                              <select
                                className="input-base text-sm"
                                value={tuningFilter}
                                onChange={e => setTuningFilter(e.target.value)}
                              >
                                <option value="">All tunings</option>
                                {tuningFilterOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {instrumentFilter && (
                      <div className="card-base mt-3">
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-md transition-colors shadow-sm"
                          aria-expanded={techniqueAccordionOpen}
                          onClick={() => setTechniqueAccordionOpen(prev => !prev)}
                        >
                          <span>Technique filters</span>
                          <span className="text-xl">{techniqueAccordionOpen ? '▾' : '▴'}</span>
                        </button>
                        {techniqueAccordionOpen && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by technique</div>
                          {availableTechniqueFilters.length === 0 ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400">No techniques available for {instrumentFilter}.</p>
                          ) : (
                            <>
                              <div className="flex flex-col gap-2">
                                {availableTechniqueFilters.map(tech => (
                                  <label key={tech} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 accent-brand-500 dark:accent-brand-400"
                                      checked={techniqueFilters.has(tech)}
                                      onChange={() => toggleTechniqueFilter(tech)}
                                    />
                                    <span className="cursor-pointer">{tech}</span>
                                  </label>
                                ))}
                              </div>
                              <div className="mt-3">
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Match mode</div>
                                <div className="flex items-center gap-3">
                                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                                    <input
                                      type="radio"
                                      name="technique-match-mode"
                                      value="all"
                                      className="h-3 w-3"
                                      checked={techniqueMatchMode === 'all'}
                                      onChange={() => setTechniqueMatchMode('all')}
                                    />
                                    <span>All</span>
                                  </label>
                                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                                    <input
                                      type="radio"
                                      name="technique-match-mode"
                                      value="any"
                                      className="h-3 w-3"
                                      checked={techniqueMatchMode === 'any'}
                                      onChange={() => setTechniqueMatchMode('any')}
                                    />
                                    <span>Any</span>
                                  </label>
                                </div>
                              </div>
                              <div className="mt-3">
                                <button
                                  type="button"
                                  className="btn-secondary text-xs"
                                  onClick={() => setTechniqueFilters(new Set())}
                                >
                                  Clear filters
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        )}
                      </div>
                    )}
                    <div className="card-base mt-3">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-md transition-colors shadow-sm"
                        aria-expanded={genreAccordionOpen}
                        onClick={() => setGenreAccordionOpen(prev => !prev)}
                      >
                        <span>Genre filters</span>
                        <span className="text-xl">{genreAccordionOpen ? '▾' : '▴'}</span>
                      </button>
                      {genreAccordionOpen && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by genre</div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {genreOptions.map(genre => (
                              <label key={genre} className="inline-flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-brand-500 dark:accent-brand-400"
                                  checked={genreFilters.has(genre)}
                                  onChange={() => toggleGenreFilter(genre)}
                                />
                                <span className="truncate">{genre}</span>
                              </label>
                            ))}
                          </div>
                          <div className="mt-3">
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Match mode</div>
                            <div className="flex items-center gap-3">
                              <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="radio"
                                  name="genre-match-mode"
                                  value="all"
                                  className="h-3 w-3"
                                  checked={genreMatchMode === 'all'}
                                  onChange={() => setGenreMatchMode('all')}
                                />
                                <span>All</span>
                              </label>
                              <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="radio"
                                  name="genre-match-mode"
                                  value="any"
                                  className="h-3 w-3"
                                  checked={genreMatchMode === 'any'}
                                  onChange={() => setGenreMatchMode('any')}
                                />
                                <span>Any</span>
                              </label>
                            </div>
                          </div>
                          <div className="mt-3">
                            <button
                              type="button"
                              className="btn-secondary text-xs"
                              onClick={() => setGenreFilters(new Set())}
                            >
                              Clear filters
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="card-base mt-3">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-md transition-colors shadow-sm"
                        aria-expanded={keyAccordionOpen}
                        onClick={() => setKeyAccordionOpen(prev => !prev)}
                      >
                        <span>Key filters</span>
                        <span className="text-xl">{keyAccordionOpen ? '▾' : '▴'}</span>
                      </button>
                      {keyAccordionOpen && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by key</div>
                          <select
                            className="input-base text-sm"
                            value={keyFilter}
                            onChange={e => setKeyFilter(e.target.value)}
                          >
                            <option value="">All keys</option>
                            <option value="C">C</option>
                            <option value="C#">C#</option>
                            <option value="Db">Db</option>
                            <option value="D">D</option>
                            <option value="Eb">Eb</option>
                            <option value="E">E</option>
                            <option value="F">F</option>
                            <option value="F#">F#</option>
                            <option value="Gb">Gb</option>
                            <option value="G">G</option>
                            <option value="Ab">Ab</option>
                            <option value="A">A</option>
                            <option value="Bb">Bb</option>
                            <option value="B">B</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="card-base mt-3">
                      <button
                        type="button"
                          className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-md transition-colors shadow-sm"
                        aria-expanded={bpmAccordionOpen}
                        onClick={() => setBpmAccordionOpen(prev => !prev)}
                      >
                        <span>BPM filters</span>
                        <span className="text-xl">{bpmAccordionOpen ? '▾' : '▴'}</span>
                      </button>
                      {bpmAccordionOpen && (
                      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by BPM</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label htmlFor="bpm-min" className="block text-xs text-gray-700 dark:text-gray-300 mb-2">Min</label>
                            <input
                              id="bpm-min"
                              type="number"
                              min={1}
                              placeholder="e.g. 90"
                              className="input-base text-sm"
                              value={bpmMinFilter}
                              onChange={e => setBpmMinFilter(e.target.value)}
                            />
                          </div>
                          <div>
                            <label htmlFor="bpm-max" className="block text-xs text-gray-700 dark:text-gray-300 mb-2">Max</label>
                            <input
                              id="bpm-max"
                              type="number"
                              min={1}
                              placeholder="e.g. 140"
                              className="input-base text-sm"
                              value={bpmMaxFilter}
                              onChange={e => setBpmMaxFilter(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                    <div className="card-base mt-3">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-md transition-colors shadow-sm"
                        aria-expanded={pitchAccordionOpen}
                        onClick={() => setPitchAccordionOpen(prev => !prev)}
                      >
                        <span>Pitch standard filters</span>
                        <span className="text-xl">{pitchAccordionOpen ? '▾' : '▴'}</span>
                      </button>
                      {pitchAccordionOpen && (
                      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by pitch standard (Hz)</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label htmlFor="pitch-min" className="block text-xs text-gray-700 dark:text-gray-300 mb-2">Min</label>
                            <input
                              id="pitch-min"
                              type="number"
                              min={400}
                              max={500}
                              placeholder="e.g. 440"
                              className="input-base text-sm"
                              value={pitchStandardMinFilter}
                              onChange={e => setPitchStandardMinFilter(e.target.value)}
                            />
                          </div>
                          <div>
                            <label htmlFor="pitch-max" className="block text-xs text-gray-700 dark:text-gray-300 mb-2">Max</label>
                            <input
                              id="pitch-max"
                              type="number"
                              min={400}
                              max={500}
                              placeholder="e.g. 452"
                              className="input-base text-sm"
                              value={pitchStandardMaxFilter}
                              onChange={e => setPitchStandardMaxFilter(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                )}
              </aside>
              <div className="flex-1 space-y-4">
                <div className="card-base glass-effect p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Song list</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Manage your songs, filters, and playlists.</p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setForm(initialSong);
                        setEditingUid(null);
                        setPage('form');
                      }}
                      disabled={loading}
                    >
                      Add a song
                    </button>
                  </div>
                  <div className="mt-4 relative">
                    <input
                      type="text"
                      placeholder="Search by title, artist, or album..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="input-base pr-10"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                        aria-label="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {selectedSongs.size > 0 && (
                  <div className="card-base glass-effect p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{selectedSongs.size} song(s) selected</span>
                      <div className="flex flex-wrap gap-2">
                        <div className="relative">
                          <button
                            type="button"
                            className="btn-primary text-sm px-3 py-1.5"
                            onClick={() => setBulkPlaylistOpen(prev => !prev)}
                            disabled={loading || playlists.length === 0}
                          >
                            Add to playlist
                          </button>
                          {bulkPlaylistOpen && (
                            <div className="absolute right-0 mt-2 w-72 rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 shadow-lg z-20 p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-gray-700 dark:text-gray-200">Select playlists</p>
                                <button
                                  type="button"
                                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                  onClick={() => setBulkPlaylistOpen(false)}
                                >
                                  ✕
                                </button>
                              </div>
                              {playlists.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  No playlists found.{' '}
                                  <Link to="/my-playlists" className="text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300">Create one</Link>
                                </p>
                              ) : (
                                <>
                                  <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
                                    {playlists.map(pl => (
                                      <label
                                        key={pl.uid}
                                        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={bulkPlaylistSelection.has(pl.uid)}
                                          onChange={() => toggleBulkPlaylistSelection(pl.uid)}
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
                                      className="text-sm px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                      onClick={() => setBulkPlaylistOpen(false)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className="text-sm px-3 py-1 rounded-md bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
                                      onClick={handleApplySelectedToPlaylists}
                                      disabled={bulkPlaylistSelection.size === 0 || loading}
                                    >
                                      Add
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {instrumentFilter && (
                          <button
                            type="button"
                            className="btn-primary text-sm px-3 py-1.5"
                            onClick={handleMarkSelectedAsPlayedNow}
                            disabled={loading}
                          >
                            {`Mark as played on ${instrumentFilter}`}
                          </button>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md bg-red-600 text-white px-3 py-1.5 text-sm hover:bg-red-700 disabled:opacity-50"
                          onClick={handleDeleteSelected}
                          disabled={loading}
                        >
                          Delete selected
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {loading ? (
                  <div className="card-base p-6 text-sm text-gray-600 dark:text-gray-400">Loading...</div>
                ) : filteredSongs.length === 0 ? (
                  <div className="card-base p-6 text-center text-gray-600 dark:text-gray-400">
                    {searchQuery ? 'No songs match your search.' : 'No songs saved.'}
                  </div>
                ) : (
                  <div className="card-base overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm">
                          <tr>
                            <th className="text-center p-2 border-b dark:border-gray-700 w-12">
                              <input
                                type="checkbox"
                                className="h-4 w-4 cursor-pointer accent-brand-500 dark:accent-brand-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                                checked={allDisplayedSelected}
                                onChange={toggleSelectAll}
                                disabled={loading}
                                title={allDisplayedSelected ? "Deselect all" : "Select all"}
                              />
                            </th>
                            <SortHeader column="artist" label="Artist" />
                            <SortHeader column="title" label="Title" />
                            <SortHeader column="lastPlayed" label="Last played" />
                            <th className="text-left p-2 border-b dark:border-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedSongs.map(song => (
                            <tr
                              key={song.uid}
                              className={`border-b dark:border-gray-700 cursor-pointer ${selectedSongs.has(song.uid) ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                              onClick={() => toggleSelectSong(song.uid)}
                            >
                              <td
                                className="p-2 text-center w-12"
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => e.stopPropagation()}
                                tabIndex={-1}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 cursor-pointer accent-brand-500 dark:accent-brand-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                                  checked={selectedSongs.has(song.uid)}
                                  onChange={() => toggleSelectSong(song.uid)}
                                  disabled={loading}
                                />
                              </td>
                              <td className="p-2 align-middle max-w-xs truncate" title={song.artist}>{song.artist}</td>
                              <td className="p-2 align-middle max-w-sm truncate" title={song.title}>{song.title}</td>
                              <td className="p-2 align-middle max-w-32">
                                {instrumentFilter ? formatLastPlayed(getLastPlayedForSong(song.uid)) : 'Select instrument'}
                              </td>
                              <td className="p-2 align-middle">
                                <button
                                  type="button"
                                  className="btn-secondary text-xs"
                                  onClick={() => {
                                    navigate(`/song/${toSlug(song.artist)}/${toSlug(song.title)}`);
                                  }}
                                  disabled={loading}
                                >
                                  Edit
                                </button>
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
          </div>
        </>
      ) : (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="card-base glass-effect p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Link to="/" className="text-2xl font-semibold text-gradient">Musician Tools</Link>
                <p className="text-sm text-gray-600 dark:text-gray-400">{editingUid ? 'Edit a song' : 'Add a song'}</p>
              </div>

            </div>
          <SongForm
            mode={editingUid ? 'edit' : 'add'}
            form={form}
            loading={loading}
            onChange={handleChange}
            onChangeInstruments={setFormInstruments}
            onSetMyInstrumentUid={setFormMyInstrumentUid}
            onSetTechniques={setFormTechniques}
            onToggleGenre={toggleFormGenre}
            onSetInstrumentDifficulty={setInstrumentDifficulty}
            onSetInstrumentTuning={setInstrumentTuning}
            onToggleTechnique={toggleFormTechnique}
            onSetInstrumentLinksForInstrument={setInstrumentLinksForInstrument}
            onSetStreamingLinks={setStreamingLinks}
            onSubmit={handleSubmit}
            onCancel={() => {
              setEditingUid(null);
              setForm(initialSong);
              setPage('list');
            }}
            onDelete={editingUid ? () => handleDelete(editingUid) : undefined}
          />
          </div>
        </div>
      )}
    </div>
  );
}

export default SongsPage;
