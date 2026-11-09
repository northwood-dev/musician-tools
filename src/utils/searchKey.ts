import { foldText } from './songDuplicate';

// What search compares (#76): "earth wind and fire" finds "Earth, Wind & Fire", "acdc" finds
// "AC/DC". Only for finding: the same-song rule (songDuplicate) doesn't ignore punctuation.
//
// A fixed list, the same as the database's f_search_key, and not "all but letters and digits":
// measured on Postgres, [:alnum:] drops the vowel sign of "पि" in production and keeps it in
// dev, because they use different locale providers, and \s removes a no-break space only in
// production. So the spaces are listed too.
const PUNCTUATION = /[ \t\n\r\f\v\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff!"#$%'()*+,\-./:;<=>?@[\\\]^_`{|}~\u00b4\u2018\u2019\u201a\u201c\u201d\u201e\u00ab\u00bb\u2039\u203a\u2010\u2011\u2012\u2013\u2014\u2015\u2026\u00b7\u2022\u00a1\u00bf]/g;

export const searchKey = (value: string | null | undefined): string =>
  foldText(value).replace(/&/g, 'and').replace(PUNCTUATION, '');
