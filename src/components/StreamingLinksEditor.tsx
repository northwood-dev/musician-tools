import { useState } from 'react';
import { CATALOG_PLATFORMS, isPlatformLink, linkName, songlistLinkError, type CatalogPlatform, type StreamingLink } from '../utils/streamingLinks';

type Props = {
  links: StreamingLink[];
  onChange: (links: StreamingLink[]) => void;
  disabled?: boolean;
  /** "songlist": a free list of links. "catalog": the three official platform fields. */
  mode?: 'songlist' | 'catalog';
};

// The streaming links of a song (#35), in one of two modes.
export function StreamingLinksEditor({ mode = 'songlist', ...props }: Props) {
  return mode === 'catalog' ? <CatalogLinkFields {...props} /> : <SonglistLinks {...props} />;
}

// Catalog mode (#109): one field per platform. A valid track link (or an empty field) is
// saved at once; anything else stays in the field with a message and is never saved.
function CatalogLinkFields({ links, onChange, disabled = false }: Omit<Props, 'mode'>) {
  const [drafts, setDrafts] = useState<Partial<Record<CatalogPlatform, string>>>({});

  const change = (platform: CatalogPlatform, value: string) => {
    const url = value.trim();
    if (url && !isPlatformLink(platform, url)) {
      setDrafts(prev => ({ ...prev, [platform]: value }));
      return;
    }
    setDrafts(prev => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
    const byPlatform = new Map(links.map(l => [l.label, l]));
    if (url) byPlatform.set(platform, { label: platform, url });
    else byPlatform.delete(platform);
    onChange(CATALOG_PLATFORMS.flatMap(p => byPlatform.get(p) ?? []));
  };

  return (
    <div className="space-y-3">
      <span className="label-base">Streaming links</span>
      {CATALOG_PLATFORMS.map(platform => {
        const id = `cat-link-${platform.toLowerCase()}`;
        const draft = drafts[platform];
        const saved = links.find(l => l.label === platform)?.url ?? '';
        return (
          <div key={platform}>
            <label htmlFor={id} className="label-base">{platform} link</label>
            <input
              id={id}
              type="url"
              className="input-base"
              placeholder={`A ${platform} track link`}
              value={draft ?? saved}
              onChange={(e) => change(platform, e.target.value)}
              disabled={disabled}
              aria-invalid={draft !== undefined}
            />
            {draft !== undefined && (
              <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">Not a {platform} track link</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Songlist mode (#108): a free list, added by pasting a URL with an optional label, removed
// with ✕ (no edit in place).
function SonglistLinks({ links, onChange, disabled = false }: Omit<Props, 'mode'>) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const trimmedUrl = url.trim();
    const trimmedLabel = label.trim();
    if (!trimmedUrl) return;
    const problem = songlistLinkError(trimmedUrl, trimmedLabel, links.length);
    if (problem) {
      setError(problem);
      return;
    }
    onChange([...links, trimmedLabel ? { url: trimmedUrl, label: trimmedLabel } : { url: trimmedUrl }]);
    setUrl('');
    setLabel('');
    setError(null);
  };

  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Listen</span>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {links.map((link, idx) => (
            <div
              key={`streaming-link-${link.url}-${link.label ?? ''}`}
              className="inline-flex items-center gap-1 rounded-md bg-blue-100 dark:bg-blue-900 px-3 py-1 text-sm text-blue-800 dark:text-blue-100"
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[20rem]" title={link.url}>
                {linkName(link)}
              </a>
              <button
                type="button"
                className="ml-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 px-1"
                onClick={() => onChange(links.filter((_, i) => i !== idx))}
                aria-label={`Remove ${linkName(link)} link`}
                title="Remove link"
                disabled={disabled}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          aria-label="Link URL"
          placeholder="https://…"
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          disabled={disabled}
        />
        <input
          type="text"
          aria-label="Link label (optional)"
          placeholder="Label (optional)"
          className="sm:w-40 rounded-md border border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
          value={label}
          onChange={(e) => { setLabel(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          disabled={disabled}
        />
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md bg-brand-500 text-white px-3 py-2 text-sm hover:bg-brand-600 disabled:opacity-50"
          onClick={add}
          disabled={disabled}
        >
          Add link
        </button>
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
