import { foldText } from './songDuplicate';

// What search compares (#76): "earth wind and fire" finds "Earth, Wind & Fire", "acdc" finds
// "AC/DC". Only for finding: the same-song rule (songDuplicate) doesn't ignore punctuation.
//
// A fixed list, the same as the database's f_search_key, and not "all but letters and digits":
// measured on Postgres, [:alnum:] drops the vowel sign of "पि" in production and keeps it in
// dev, because they use different locale providers.
const PUNCTUATION = /[\s!"#$%'()*+,\-./:;<=>?@[\\\]^_`{|}~´‘’‚“”„«»‹›–—―…·•¡¿]/g;

export const searchKey = (value: string | null | undefined): string =>
  foldText(value).replace(/&/g, 'and').replace(PUNCTUATION, '');
