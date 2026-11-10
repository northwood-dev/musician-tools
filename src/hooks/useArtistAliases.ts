import { useEffect, useState } from 'react';
import { artistAliasService, type ArtistAlias } from '../services/artistAliasService';

/**
 * The artist aliases song search compares in the browser (#76, #84). If they can't be loaded,
 * search just has no alias: no error is shown.
 */
export function useArtistAliases(): ArtistAlias[] {
  const [artistAliases, setArtistAliases] = useState<ArtistAlias[]>([]);
  useEffect(() => {
    let active = true;
    artistAliasService.list()
      .then(list => { if (active) setArtistAliases(list); })
      .catch(() => { /* degrade: search without aliases */ });
    return () => { active = false; };
  }, []);
  return artistAliases;
}
