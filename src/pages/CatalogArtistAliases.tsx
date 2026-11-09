import { useCallback, useEffect, useId, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ListSkeleton } from '../components/ListSkeleton';
import { artistAliasService, ArtistAliasConflictError } from '../services/artistAliasService';
import type { ArtistAliasWithCount } from '../services/artistAliasService';

// #76: curators manage the artist aliases search uses. To change one, remove it and add it
// again. The count of Catalog entries is what makes a broken alias visible: the artist is free
// text, so renaming it in the Catalog leaves the alias finding nothing, without any error.
export default function CatalogArtistAliases() {
  const { user } = useAuth();
  const isCurator = !!user?.isCurator;
  const aliasId = useId();
  const artistId = useId();

  const [aliases, setAliases] = useState<ArtistAliasWithCount[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [alias, setAlias] = useState('');
  const [artist, setArtist] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<ArtistAliasWithCount | null>(null);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      setAliases(await artistAliasService.listWithCounts());
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    if (isCurator) load();
  }, [isCurator, load]);

  if (!isCurator) {
    return <Navigate to="/" replace />;
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setDone(null);
    const newAlias = alias.trim();
    const newArtist = artist.trim();
    if (!newAlias || !newArtist) {
      setError('Enter an alias and an artist.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await artistAliasService.create({ alias: newAlias, artist: newArtist });
      setAlias('');
      setArtist('');
      setDone(`Alias "${newAlias}" added.`);
      await load();
    } catch (err) {
      if (err instanceof ArtistAliasConflictError) {
        setError(err.existing
          ? `"${err.existing.alias}" already exists, for ${err.existing.artist}.`
          : 'This alias already exists.');
      } else {
        setError('Could not add this alias.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!toRemove || removing) return;
    setRemoving(true);
    setDone(null);
    setError(null);
    try {
      await artistAliasService.remove(toRemove.uid);
      setDone(`Alias "${toRemove.alias}" removed.`);
      await load();
    } catch {
      setError(`Could not remove "${toRemove.alias}".`);
    } finally {
      setRemoving(false);
      setToRemove(null);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Artist aliases</h1>
      <p className="mt-1 mb-6 text-sm text-gray-600 dark:text-gray-300">
        Typing an alias in full also searches for its artist, in the Catalog and in every Songlist. It never decides that two songs are the same.
      </p>

      <form onSubmit={handleAdd} noValidate className="card-base p-4 mb-6 grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <div>
          <label htmlFor={aliasId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alias</label>
          <input id={aliasId} className="input-base" value={alias} maxLength={255} onChange={e => setAlias(e.target.value)} placeholder="RHCP" />
        </div>
        <div>
          <label htmlFor={artistId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Artist</label>
          <input id={artistId} className="input-base" value={artist} maxLength={255} onChange={e => setArtist(e.target.value)} placeholder="Red Hot Chili Peppers" />
        </div>
        <button type="submit" className="btn-primary min-h-[44px]" disabled={saving}>
          {saving ? 'Adding…' : 'Add alias'}
        </button>
      </form>

      {error && <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {done && <p role="status" className="mb-4 text-sm text-green-700 dark:text-green-300">{done}</p>}

      {loadFailed && (
        <div className="text-center py-10">
          <p className="text-gray-600 dark:text-gray-300">Something went wrong.</p>
          <button type="button" className="btn-secondary mt-3" onClick={load}>Retry</button>
        </div>
      )}

      {!loadFailed && aliases === null && <ListSkeleton rows={6} />}

      {!loadFailed && aliases?.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400 py-6 text-center">No aliases yet.</p>
      )}

      {!loadFailed && aliases !== null && aliases.length > 0 && (
        <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th scope="col" className="px-3 py-2 font-medium">Alias</th>
                <th scope="col" className="px-3 py-2 font-medium">Artist</th>
                <th scope="col" className="px-3 py-2 font-medium">Catalog</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {aliases.map(row => (
                <tr key={row.uid} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{row.alias}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.artist}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.entryCount === 0
                      ? <span className="font-medium text-amber-700 dark:text-amber-300"><span aria-hidden="true">⚠ </span>No Catalog entry found</span>
                      : <span className="text-gray-600 dark:text-gray-300">{row.entryCount} {row.entryCount === 1 ? 'entry' : 'entries'}</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="btn-secondary text-xs min-h-[44px]"
                      aria-label={`Remove alias ${row.alias}`}
                      onClick={() => setToRemove(row)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link to="/catalog/manage" className="inline-block mt-8 text-sm text-brand-600 dark:text-brand-400 hover:underline">← Manage the Catalog</Link>

      <ConfirmDialog
        isOpen={toRemove !== null}
        title="Remove this alias"
        message={toRemove ? `Remove "${toRemove.alias}"? Typing it will no longer search for ${toRemove.artist}.` : ''}
        confirmText={removing ? 'Removing…' : 'Remove'}
        cancelText="Cancel"
        onConfirm={handleRemove}
        onCancel={() => { if (!removing) setToRemove(null); }}
      />
    </div>
  );
}
