import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog } from './Dialog';
import { Notice } from './Notice';
import type { CatalogSuggestionLine, MergeDecision, MergeDecisions, SuggestionDifference } from '../services/catalogService';
import { formatSecondsToMmss } from '../utils/duration';

// #237: "Merge into the Catalog entry" — the song is already published, and some suggested values
// differ from the entry. Each differing field is decided: accept ONE suggested value (it corrects
// the entry) or reject (the entry keeps its value). Merge waits until every field is decided, so
// nothing is applied unseen. A suggested value equal to the entry's is not an "Accept" (it would
// change nothing): its users show on the Reject choice instead. When the group changed while
// the dialog was open, the page passes the line again with its current differences and a
// `notice`: the choices start over (the form is keyed by the differences).

const FIELD_LABEL: Record<SuggestionDifference['field'], string> = {
  key: 'Key',
  mode: 'Mode',
  bpm: 'BPM',
  timeSignature: 'Time signature',
  durationSeconds: 'Duration',
  language: 'Languages',
  genre: 'Genres',
  pitchStandard: 'Pitch standard',
};

function show(field: SuggestionDifference['field'], value: SuggestionDifference['catalog']): string {
  if (value == null) return 'nothing';
  if (Array.isArray(value)) return value.join(', ');
  if (field === 'durationSeconds' && typeof value === 'number') return formatSecondsToMmss(value);
  return String(value);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const usersLabel = (users: number) => `${users} ${users === 1 ? 'user' : 'users'}`;

export function MergeSuggestionDialog({
  line,
  notice = null,
  busy,
  onCancel,
  onMerge,
}: {
  /** The line to merge; null = closed. */
  line: CatalogSuggestionLine | null;
  /** Why the dialog is shown again (the group changed), if it is. */
  notice?: string | null;
  busy: boolean;
  onCancel: () => void;
  onMerge: (decisions: MergeDecisions) => void;
}) {
  return (
    <Dialog open={line !== null} onClose={() => { if (!busy) onCancel(); }} title="Merge into the Catalog entry" size="md">
      {line && (
        <MergeForm
          key={`${line.id} ${JSON.stringify(line.catalog?.differences)}`}
          line={line}
          notice={notice}
          busy={busy}
          onCancel={onCancel}
          onMerge={onMerge}
        />
      )}
    </Dialog>
  );
}

function MergeForm({ line, notice, busy, onCancel, onMerge }: {
  line: CatalogSuggestionLine;
  notice: string | null;
  busy: boolean;
  onCancel: () => void;
  onMerge: (decisions: MergeDecisions) => void;
}) {
  const differences = line.catalog?.differences ?? [];
  const [decisions, setDecisions] = useState<MergeDecisions>({});
  const allDecided = differences.every(d => decisions[d.field] !== undefined);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => { e.preventDefault(); if (allDecided && !busy) onMerge(decisions); }}
    >
      {notice && <Notice tone="warning">{notice}</Notice>}
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Decide each value that differs. Accepting one corrects the Catalog entry; then the suggesters&apos; songs are tied to it.
        Suggesters who left a value empty will be offered the Catalog&apos;s value.
      </p>
      {differences.map(difference => {
        const label = FIELD_LABEL[difference.field];
        const keptBy = difference.suggested.find(s => same(s.value, difference.catalog));
        const others = difference.suggested.filter(s => !same(s.value, difference.catalog));
        const name = `merge-${difference.field}`;
        const current = decisions[difference.field];
        const choose = (decision: MergeDecision) => setDecisions(prev => ({ ...prev, [difference.field]: decision }));
        return (
          <fieldset key={difference.field} className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
            <legend className="px-1 text-sm font-medium text-gray-900 dark:text-gray-100">{label}</legend>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Catalog: {show(difference.field, difference.catalog)}</p>
            <div className="space-y-1">
              {others.map(option => (
                <label key={JSON.stringify(option.value)} className="flex items-center gap-2 text-sm min-h-[44px] cursor-pointer">
                  <input
                    type="radio"
                    name={name}
                    className="h-4 w-4 accent-brand-500 dark:accent-brand-400"
                    checked={typeof current === 'object' && same(current.accept, option.value)}
                    onChange={() => choose({ accept: option.value })}
                    disabled={busy}
                  />
                  Accept {show(difference.field, option.value)} ({usersLabel(option.users)})
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm min-h-[44px] cursor-pointer">
                <input
                  type="radio"
                  name={name}
                  className="h-4 w-4 accent-brand-500 dark:accent-brand-400"
                  checked={current === 'reject'}
                  onChange={() => choose('reject')}
                  disabled={busy}
                />
                Reject — keep {show(difference.field, difference.catalog)}{keptBy ? ` (${usersLabel(keptBy.users)})` : ''}
              </label>
            </div>
          </fieldset>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to={`/catalog/admin/${line.catalog?.uid}`} className="btn-link">Edit the Catalog entry</Link>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary btn-sm min-h-[44px]" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary btn-sm min-h-[44px]" disabled={!allDecided || busy}>
            {busy ? 'Merging…' : 'Merge'}
          </button>
        </div>
      </div>
    </form>
  );
}
