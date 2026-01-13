export interface SongsSidebarProps {
  // UI state
  sidebarExpanded: boolean;
  setSidebarExpanded: (e: boolean) => void;
  filtersAccordionOpen: boolean;
  setFiltersAccordionOpen: (o: boolean) => void;
  playlistAccordionOpen: boolean;
  setPlaylistAccordionOpen: (o: boolean) => void;
  tuningAccordionOpen: boolean;
  setTuningAccordionOpen: (o: boolean) => void;
  techniqueAccordionOpen: boolean;
  setTechniqueAccordionOpen: (o: boolean) => void;
  genreAccordionOpen: boolean;
  setGenreAccordionOpen: (o: boolean) => void;
  keyAccordionOpen: boolean;
  setKeyAccordionOpen: (o: boolean) => void;
  bpmAccordionOpen: boolean;
  setBpmAccordionOpen: (o: boolean) => void;
  pitchAccordionOpen: boolean;
  setPitchAccordionOpen: (o: boolean) => void;

  // Filter values
  instrumentFilter: string;
  myInstrumentFilter: string;
  instrumentDifficultyFilter: number | '';
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

  // Filter setters
  setInstrumentFilter: (f: string) => void;
  setMyInstrumentFilter: (f: string) => void;
  setInstrumentDifficultyFilter: (f: number | '') => void;
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

  // Data
  playlists: Array<{ uid: string; name: string; songUids?: string[] }>;
  myInstruments: Array<{ uid: string; type?: string; name: string }>;
  instrumentTypeOptions: string[];
  tuningFilterOptions: Array<{ value: string; label: string }>;
  genreOptions: string[];
  availableTechniqueFilters: string[];
  hasActiveFilters: boolean;
  showTuningFilters: boolean;
  clearAllFilters: () => void;
}

export default function SongsSidebar(props: SongsSidebarProps) {
  return (
    <aside
      id="songs-sidebar"
      className={`${props.sidebarExpanded ? 'w-full lg:w-80' : 'w-12 lg:w-12'} shrink-0 min-w-[48px] overflow-hidden transition-all duration-300 card-base glass-effect lg:sticky lg:top-24`}
      aria-hidden={false}
    >
      {/* Collapsed rail shows only toggle button */}
      {!props.sidebarExpanded ? (
        <div className="p-2 flex items-center justify-center">
          <button
            type="button"
            className="btn-secondary text-xs px-2 py-1"
            aria-label="Expand sidebar"
            onClick={() => props.setSidebarExpanded(true)}
          >
            »
          </button>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Filters</h3>
              {props.hasActiveFilters && (
                <button
                  type="button"
                  className="btn-secondary text-xs px-2 py-1"
                  onClick={props.clearAllFilters}
                >
                  Clear all
                </button>
              )}
            </div>
            <button
              type="button"
              className="btn-secondary text-xs px-2 py-1"
              aria-label="Collapse sidebar"
              onClick={() => props.setSidebarExpanded(false)}
            >
              «
            </button>
          </div>
          <div className="card-base">
            <button
              type="button"
              className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-md transition-colors shadow-sm"
              aria-expanded={props.filtersAccordionOpen}
              onClick={() => props.setFiltersAccordionOpen(!props.filtersAccordionOpen)}
            >
              <span>Instrument filters</span>
              <span className="text-xl">{props.filtersAccordionOpen ? '▾' : '▴'}</span>
            </button>
            {props.filtersAccordionOpen && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by instrument</div>
                  <select
                    value={props.instrumentFilter}
                    onChange={(e) => props.setInstrumentFilter(e.target.value)}
                    className="input-base text-sm"
                  >
                    <option value="">All instruments</option>
                    {props.instrumentTypeOptions.map(inst => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by my instrument</div>
                  <select
                    value={props.myInstrumentFilter}
                    onChange={(e) => props.setMyInstrumentFilter(e.target.value)}
                    className="input-base text-sm"
                  >
                    <option value="">All my instruments</option>
                    {props.myInstruments.map(mi => (
                      <option key={mi.uid} value={mi.uid}>{mi.type ? `${mi.type} - ${mi.name}` : mi.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => {
                      props.setInstrumentFilter('');
                      props.setMyInstrumentFilter('');
                      props.setInstrumentDifficultyFilter('');
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
              aria-expanded={props.playlistAccordionOpen}
              onClick={() => props.setPlaylistAccordionOpen(!props.playlistAccordionOpen)}
            >
              <span>Playlist filters</span>
              <span className="text-xl">{props.playlistAccordionOpen ? '▾' : '▴'}</span>
            </button>
            {props.playlistAccordionOpen && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by playlist</div>
                <select
                  className="input-base text-sm"
                  value={props.playlistFilter}
                  onChange={e => props.setPlaylistFilter(e.target.value)}
                >
                  <option value="">All playlists</option>
                  {props.playlists.map(playlist => (
                    <option key={playlist.uid} value={playlist.uid}>{playlist.name}</option>
                  ))}
                </select>
                {props.playlistFilter && (
                  <div className="pt-1">
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => props.setPlaylistFilter('')}
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
                value={props.instrumentDifficultyFilter === '' ? '' : props.instrumentDifficultyFilter}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  props.setInstrumentDifficultyFilter(val as number | '');
                }}
                className="input-base text-sm"
                disabled={!props.instrumentFilter}
              >
                <option value="">All difficulties</option>
                {[1,2,3,4,5].map(n => (
                  <option key={n} value={n}>{`Up to ${n} ★`}</option>
                ))}
              </select>
            </div>
          </div>
          {props.showTuningFilters && (
            <div className="card-base mt-3">
              <button
                type="button"
                className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-md transition-colors shadow-sm"
                aria-expanded={props.tuningAccordionOpen}
                onClick={() => props.setTuningAccordionOpen(!props.tuningAccordionOpen)}
              >
                <span>Tuning filters</span>
                <span className="text-xl">{props.tuningAccordionOpen ? '▾' : '▴'}</span>
              </button>
              {props.tuningAccordionOpen && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by tuning</div>
                  {props.tuningFilterOptions.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">No tunings available for {props.instrumentFilter}.</p>
                  ) : (
                    <select
                      className="input-base text-sm"
                      value={props.tuningFilter}
                      onChange={e => props.setTuningFilter(e.target.value)}
                    >
                      <option value="">All tunings</option>
                      {props.tuningFilterOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}
          {props.instrumentFilter && (
            <div className="card-base mt-3">
              <button
                type="button"
                className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-md transition-colors shadow-sm"
                aria-expanded={props.techniqueAccordionOpen}
                onClick={() => props.setTechniqueAccordionOpen(!props.techniqueAccordionOpen)}
              >
                <span>Technique filters</span>
                <span className="text-xl">{props.techniqueAccordionOpen ? '▾' : '▴'}</span>
              </button>
              {props.techniqueAccordionOpen && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by technique</div>
                {props.availableTechniqueFilters.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No techniques available for {props.instrumentFilter}.</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      {props.availableTechniqueFilters.map(tech => (
                        <label key={tech} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-brand-500 dark:accent-brand-400"
                            checked={props.technicianFilters.has(tech)}
                            onChange={() => props.toggleTechniqueFilter(tech)}
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
                            checked={props.techniqueMatchMode === 'all'}
                            onChange={() => props.setTechniqueMatchMode('all')}
                          />
                          <span>All</span>
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="technique-match-mode"
                            value="any"
                            className="h-3 w-3"
                            checked={props.techniqueMatchMode === 'any'}
                            onChange={() => props.setTechniqueMatchMode('any')}
                          />
                          <span>Any</span>
                        </label>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => props.toggleTechniqueFilter('')}
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
              aria-expanded={props.genreAccordionOpen}
              onClick={() => props.setGenreAccordionOpen(!props.genreAccordionOpen)}
            >
              <span>Genre filters</span>
              <span className="text-xl">{props.genreAccordionOpen ? '▾' : '▴'}</span>
            </button>
            {props.genreAccordionOpen && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by genre</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {props.genreOptions.map(genre => (
                    <label key={genre} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand-500 dark:accent-brand-400"
                        checked={props.genreFilters.has(genre)}
                        onChange={() => props.toggleGenreFilter(genre)}
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
                        checked={props.genreMatchMode === 'all'}
                        onChange={() => props.setGenreMatchMode('all')}
                      />
                      <span>All</span>
                    </label>
                    <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="genre-match-mode"
                        value="any"
                        className="h-3 w-3"
                        checked={props.genreMatchMode === 'any'}
                        onChange={() => props.setGenreMatchMode('any')}
                      />
                      <span>Any</span>
                    </label>
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => props.toggleGenreFilter('')}
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
              aria-expanded={props.keyAccordionOpen}
              onClick={() => props.setKeyAccordionOpen(!props.keyAccordionOpen)}
            >
              <span>Key filters</span>
              <span className="text-xl">{props.keyAccordionOpen ? '▾' : '▴'}</span>
            </button>
            {props.keyAccordionOpen && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by key</div>
                <select
                  className="input-base text-sm"
                  value={props.keyFilter}
                  onChange={e => props.setKeyFilter(e.target.value)}
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
              aria-expanded={props.bpmAccordionOpen}
              onClick={() => props.setBpmAccordionOpen(!props.bpmAccordionOpen)}
            >
              <span>BPM filters</span>
              <span className="text-xl">{props.bpmAccordionOpen ? '▾' : '▴'}</span>
            </button>
            {props.bpmAccordionOpen && (
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
                    value={props.bpmMinFilter}
                    onChange={e => props.setBpmMinFilter(e.target.value)}
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
                    value={props.bpmMaxFilter}
                    onChange={e => props.setBpmMaxFilter(e.target.value)}
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
              aria-expanded={props.pitchAccordionOpen}
              onClick={() => props.setPitchAccordionOpen(!props.pitchAccordionOpen)}
            >
              <span>Pitch standard filters</span>
              <span className="text-xl">{props.pitchAccordionOpen ? '▾' : '▴'}</span>
            </button>
            {props.pitchAccordionOpen && (
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
                    value={props.pitchStandardMinFilter}
                    onChange={e => props.setPitchStandardMinFilter(e.target.value)}
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
                    value={props.pitchStandardMaxFilter}
                    onChange={e => props.setPitchStandardMaxFilter(e.target.value)}
                  />
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
