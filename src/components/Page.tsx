import type { ReactNode } from 'react';

// The page block of the design pass (#141, #155): the frame of every app page — its
// width, its margins and its one main title (the page's level-1 heading). Six widths and
// three margin recipes had grown per page family; three named widths remain:
//   narrow   sign-in pages (which keep their own centred title)
//   content  forms, details, Profile, collection compose, aliases
//   wide     Songlist, the My* pages, Catalog lists
// `title` is the page's h1 (the header's logo is not a heading), `description` a line
// under it, `actions` the buttons on the right of the title (e.g. "New entry").
export type PageWidth = 'narrow' | 'content' | 'wide';

const WIDTH: Record<PageWidth, string> = {
  narrow: 'max-w-md',
  content: 'max-w-3xl',
  wide: 'max-w-7xl',
};

export const PAGE_TITLE = 'text-2xl font-semibold text-gray-900 dark:text-gray-100';

// The main title on its own, for a page whose title is editable in place (a collection
// being renamed): the page passes no `title` to <Page> and renders this where it needs it,
// `sr-only` while the input stands in for it, so the page always keeps its one h1.
export function PageTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h1 className={`${PAGE_TITLE} ${className}`}>{children}</h1>;
}

export function Page({
  width,
  title,
  description,
  actions,
  children,
  className = '',
}: {
  width: PageWidth;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${WIDTH[width]} mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      {title && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <PageTitle>{title}</PageTitle>
            {description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
