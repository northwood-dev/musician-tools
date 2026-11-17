import { readFileSync } from 'fs';
import { join } from 'path';
import { FILTER_SECTION_IDS } from '../utils/filterSections';

// #185 guard: the back end refuses a layout naming an id it doesn't know, so its list of
// filter section ids must stay the same as the front end's.
test('the back end knows exactly the front end\'s filter section ids', () => {
  const backend = readFileSync(join(__dirname, '../../backend/constants/filterSections.js'), 'utf8');
  const list = backend.match(/FILTER_SECTION_IDS = \[([^\]]*)\]/);
  expect(list).not.toBeNull();
  const backendIds = Array.from(list![1].matchAll(/'([^']+)'/g), m => m[1]);
  expect(backendIds).toEqual([...FILTER_SECTION_IDS]);
});
