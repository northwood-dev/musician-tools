import { useCallback, useEffect, useRef, useState } from 'react';
import { profileService } from '../services/profileService';
import { moveSection, resolveFilterSections, type FilterSectionId } from '../utils/filterSections';

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

function writeBrowserCopy(sections: readonly unknown[] | null) {
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
  // Saves go one at a time: while one is in flight, only the newest layout waits (#185
  // review — two PUTs racing could leave the account on the older layout).
  const inFlight = useRef(false);
  const waiting = useRef<{ sections: readonly FilterSectionId[] | null } | null>(null);

  useEffect(() => {
    let alive = true;
    profileService.getProfile()
      .then(profile => {
        if (!alive || changedLocally.current || !('songlistFilterSections' in profile)) return;
        const fromAccount = Array.isArray(profile.songlistFilterSections) ? profile.songlistFilterSections : null;
        setSaved(fromAccount);
        writeBrowserCopy(fromAccount);
      })
      .catch(() => { /* offline or signed out: keep the browser copy / default */ });
    return () => { alive = false; };
  }, []);

  // The user's own layout, and what is shown: that plus any section holding an active filter.
  const own = resolveFilterSections(saved, new Set());
  const shown = resolveFilterSections(saved, activeSections);

  const run = useCallback((sections: readonly FilterSectionId[] | null) => {
    inFlight.current = true;
    setSaveFailed(false);
    profileService.saveSonglistFilterSections(sections)
      .then(() => true, () => false)
      .then(ok => {
        inFlight.current = false;
        const next = waiting.current;
        waiting.current = null;
        if (next) run(next.sections);
        else if (!ok) setSaveFailed(true);
      });
  }, []);

  const send = useCallback((sections: readonly FilterSectionId[] | null) => {
    lastSent.current = sections;
    if (inFlight.current) waiting.current = { sections };
    else run(sections);
  }, [run]);

  const save = useCallback((sections: readonly FilterSectionId[] | null) => {
    changedLocally.current = true;
    setSaved(sections);
    writeBrowserCopy(sections);
    send(sections);
  }, [send]);

  return {
    /** The sections to show, in order. */
    shown,
    // Changes start from the user's own layout: a section shown only for its active filter
    // is not written into the layout by an unrelated change.
    remove: (id: FilterSectionId) => save(own.filter(s => s !== id)),
    add: (id: FilterSectionId) => save([...own.filter(s => s !== id), id]),
    reset: () => save(null),
    /** #199: drop `id` at the place of `overId` (a dragged section joins the layout). */
    move: (id: FilterSectionId, overId: FilterSectionId) =>
      save(moveSection(shown, id, overId).filter(s => own.includes(s) || s === id)),
    saveFailed,
    retrySave: () => send(lastSent.current),
  };
}
