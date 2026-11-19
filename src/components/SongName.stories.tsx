import type { Meta, StoryObj } from '@storybook/react-vite';
import { SongName } from './SongName';
import { songLabel } from '../utils/songLabel';

// A song in a list or a table (#229): artist above, title below and emphasized. In a sentence,
// songLabel() gives "Artist — Title" (see InASentence).
const meta = {
  title: 'Content/SongName',
  component: SongName,
  args: { song: { artist: 'The Breeders', title: 'Cannonball' } },
} satisfies Meta<typeof SongName>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithArtist: Story = {};
export const WithoutArtist: Story = { args: { song: { artist: null, title: 'Cannonball' } } };
export const LongValues: Story = {
  args: { song: { artist: 'Nick Cave & The Bad Seeds featuring Kylie Minogue', title: 'Where the Wild Roses Grow (Radio Edit, 2011 Remaster)' } },
  decorators: [(Story) => <div style={{ maxWidth: 240 }}><Story /></div>],
};
export const InASentence: Story = {
  render: (args) => <p>Reject "{songLabel(args.song)}"? It leaves the queue.</p>,
};
