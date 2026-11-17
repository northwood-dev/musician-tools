import { useCallback, useEffect, useRef, useState } from 'react';
import { profileService } from '../services/profileService';
import { resolveFilterSections, type FilterSectionId } from '../utils/filterSections';

// #198: the Songlist sidebar layout — which filter sections show, in which order. It is
// saved on the account (phone and computer match); a browser copy lets the first paint
// use the last known layout instead of flashing the default. The account wins when it
// answers, unless the user already changed the layout meanwhile.
//
// Changes apply at once and are saved in the background; a failed save raises
// `saveFailed` and `retrySave` sends the current layout again.
const BROWSER_COPY = 'songsFilterSections';

function readBrowserCopy(): unknown[] | null {
  try {
    const raw = window.localStorage.getItem(BROWSER_COPY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeBrowserCopy(sections: readonly FilterSectionId[] | null) {
  try {
    if (sections) window.localStorage.setItem(BROWSER_COPY, JSON.stringify(sections));
    else window.localStorage.removeItem(BROWSER_COPY);
  } catch { /* ignore */ }
}

export function useFilterSectionsLayout(activeSections: ReadonlySet<FilterSectionId>) {
  const [saved, setSaved] = useState<readonly unknown[] | null>(readBrowserCopy);
  const [saveFailed, setSaveFailed] = useState(false);
  const changedLocally = useRef(false);
  const lastSent = useRef<readonly FilterSectionId[] | null>(null);
  const latestSave = useRef(0);

  useEffect(() => {
    let alive = true;
    profileService.getProfile()
      .then(profile => {
        if (!alive || changedLocally.current || !('songlistFilterSections' in profile)) return;
        const fromAccount = profile.songlistFilterSections ?? null;
        setSaved(fromAccount);
        writeBrowserCopy(fromAccount as FilterSectionId[] | null);
      })
      .catch(() => { /* offline or signed out: keep the browser copy / default */ });
    return () => { alive = false; };
  }, []);

  const shown = resolveFilterSections(saved, activeSections);

  const send = useCallback((sections: readonly FilterSectionId[] | null) => {
    lastSent.current = sections;
    const attempt = ++latestSave.current;
    setSaveFailed(false);
    profileService.saveSonglistFilterSections(sections).catch(() => {
      if (attempt === latestSave.current) setSaveFailed(true); // only the newest save speaks
    });
  }, []);

  const save = useCallback((sections: readonly FilterSectionId[] | null) => {
    changedLocally.current = true;
    setSaved(sections);
    writeBrowserCopy(sections);
    send(sections);
  }, [send]);

  return {
    /** The sections to show, in order. */
    shown,
    remove: (id: FilterSectionId) => save(shown.filter(s => s !== id)),
    add: (id: FilterSectionId) => save([...shown.filter(s => s !== id), id]),
    reset: () => save(null),
    saveFailed,
    retrySave: () => send(lastSent.current),
  };
}
