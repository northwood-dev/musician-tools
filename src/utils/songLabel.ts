// #229: a song in a sentence (messages, confirmations, tooltips): artist before title, as
// everywhere in the app (see CLAUDE.md). In lists and tables, use <SongName> instead.
export const songLabel = (song: { title: string; artist?: string | null }) => {
  const artist = (song.artist || '').trim();
  const title = song.title.trim();
  return artist ? `${artist} — ${title}` : title;
};
