import { useState } from 'react';
import type { SongPlay } from '../services/songPlayService';
import { instrumentTechniquesMap, instrumentTuningsMap } from '../constants/instrumentTypes';

interface SongFormInstrumentsProps {
  // Instruments data
  currentInstruments: string[];
  instrumentDifficulty: Record<string, number | null>;
  instrumentTuning: Record<string, string | null>;
  currentTechniques: string[];
  instrumentLinks: Record<string, Array<{ label?: string; url: string }>> | null;
  myInstrumentUid: string | undefined;
  
  // Callbacks
  onChangeInstruments: (instruments: string[]) => void;
  onSetInstrumentDifficulty?: (instrumentType: string, difficulty: number | null) => void;
  onSetInstrumentTuning?: (instrumentType: string, tuning: string | null) => void;
  onToggleTechnique: (technique: string) => void;
  onSetInstrumentLinksForInstrument?: (instrumentType: string, links: Array<{ label?: string; url: string }>) => void;
  onSetMyInstrumentUid: (uid: string | undefined) => void;
  onMarkAsPlayedNow?: (instrumentType: string) => void;
  
  // Additional data
  myInstruments?: Array<{ uid: string; name: string; type?: string | null }>;
  songPlays?: SongPlay[];
  formatLastPlayed?: (dateString: string | undefined) => string;
  mode: 'add' | 'edit';
  loading: boolean;
  
  // UI state
  expandedInstruments: Set<string>;
  setExpandedInstruments: (instruments: Set<string>) => void;
}

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

export default function SongFormInstruments(props: SongFormInstrumentsProps) {
  const {
    currentInstruments,
    instrumentDifficulty,
    instrumentTuning,
    currentTechniques,
    instrumentLinks,
    myInstrumentUid,
    onChangeInstruments,
    onSetInstrumentDifficulty,
    onSetInstrumentTuning,
    onToggleTechnique,
    onSetInstrumentLinksForInstrument,
    onSetMyInstrumentUid,
    onMarkAsPlayedNow,
    myInstruments,
    songPlays,
    formatLastPlayed,
    mode,
    loading,
    expandedInstruments,
    setExpandedInstruments,
  } = props;

  const [newLinkInputs, setNewLinkInputs] = useState<Record<string, { label: string; url: string }>>({});
  const [hoveredDifficulty, setHoveredDifficulty] = useState<Record<string, number | null>>({});

  return (
    <div className="space-y-2">
      {currentInstruments.map((instrumentType) => {
        const isExpanded = expandedInstruments.has(instrumentType);
        const filteredMyInstruments = instrumentType && myInstruments && myInstruments.length > 0
          ? myInstruments.filter(mi => (mi.type || '').toLowerCase() === instrumentType.toLowerCase())
          : [];
        const instrumentTechniques = getAvailableTechniques(instrumentType);
        
        return (
          <div key={instrumentType} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="flex-1 flex items-center gap-3 px-3 h-10 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-100"
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
                <span className="font-medium">{instrumentType}</span>
                {formatLastPlayed && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Last played: <span className="font-medium">{getLastPlayedForInstrument(instrumentType, songPlays, formatLastPlayed)}</span>
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
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
                <span className="text-gray-600 dark:text-gray-400 px-2">
                  {isExpanded ? '▾' : '▸'}
                </span>
              </div>
            </div>
            {isExpanded && (
              <div className="p-3 space-y-3 bg-gray-50 dark:bg-gray-800">
                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Difficulty</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const current = instrumentDifficulty[instrumentType] ?? null;
                      const hovered = hoveredDifficulty[instrumentType];
                      const filled = (hovered !== null && hovered !== undefined) ? (val <= hovered) : (current !== null && val <= current);
                      return (
                        <button
                          key={val}
                          type="button"
                          className="text-2xl focus:outline-none disabled:opacity-50"
                          style={{ color: filled ? '#facc15' : '#d1d5db' }}
                          onMouseEnter={() => setHoveredDifficulty(prev => ({ ...prev, [instrumentType]: val }))}
                          onMouseLeave={() => setHoveredDifficulty(prev => ({ ...prev, [instrumentType]: null }))}
                          onClick={() => {
                            if (onSetInstrumentDifficulty) {
                              const newVal = current === val ? null : val;
                              onSetInstrumentDifficulty(instrumentType, newVal);
                            }
                          }}
                          disabled={loading}
                          title={`Difficulty ${val}`}
                        >
                          ★
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tuning */}
                {getAvailableTunings(instrumentType).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Tuning</label>
                    <select
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                      value={instrumentTuning[instrumentType] || ''}
                      onChange={(e) => {
                        if (onSetInstrumentTuning) {
                          onSetInstrumentTuning(instrumentType, e.target.value || null);
                        }
                      }}
                      disabled={loading}
                    >
                      <option value="">Standard tuning</option>
                      {getAvailableTunings(instrumentType).map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* My Instrument */}
                {filteredMyInstruments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">My Instrument</label>
                    <select
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                      value={myInstrumentUid || ''}
                      onChange={(e) => onSetMyInstrumentUid(e.target.value || undefined)}
                      disabled={loading}
                    >
                      <option value="">Select one of my instruments</option>
                      {filteredMyInstruments.map((mi) => (
                        <option key={mi.uid} value={mi.uid}>{mi.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Techniques */}
                {instrumentTechniques.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Techniques</label>
                    <div className="flex flex-wrap gap-2">
                      {instrumentTechniques.map((tech) => {
                        const selected = currentTechniques.includes(tech);
                        return (
                          <button
                            key={tech}
                            type="button"
                            className={`inline-flex items-center rounded-full px-3 py-1 text-sm disabled:opacity-50 ${
                              selected
                                ? 'bg-brand-500 text-white hover:bg-brand-600'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                            onClick={() => onToggleTechnique(tech)}
                            disabled={loading}
                            title={tech}
                          >
                            {tech}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Instrument Links */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Links for {instrumentType}</label>
                  {(instrumentLinks?.[instrumentType]?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(instrumentLinks?.[instrumentType] || []).map((link, idx) => (
                        <div
                          key={`${link.url}-${idx}`}
                          className="inline-flex items-center gap-2 rounded-md bg-gray-200 dark:bg-gray-700 px-3 py-1 text-sm text-gray-800 dark:text-gray-100"
                        >
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline truncate max-w-[12rem]"
                          >
                            {link.label || link.url}
                          </a>
                          <button
                            type="button"
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            onClick={() => {
                              const currentLinks = instrumentLinks?.[instrumentType] ?? [];
                              const nextLinks = currentLinks.filter((_, i) => i !== idx);
                              if (onSetInstrumentLinksForInstrument) {
                                onSetInstrumentLinksForInstrument(instrumentType, nextLinks);
                              }
                            }}
                            disabled={loading}
                            aria-label="Remove link"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <input
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
                      type="text"
                      placeholder="Label (optional)"
                      value={(newLinkInputs[instrumentType]?.label) || ''}
                      onChange={(e) => setNewLinkInputs(prev => ({ ...prev, [instrumentType]: { ...(prev[instrumentType] || { label: '', url: '' }), label: e.target.value } }))}
                      disabled={loading}
                    />
                    <div className="flex gap-2">
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
                          const currentLinks = instrumentLinks?.[instrumentType] ?? [];
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
    </div>
  );
}
