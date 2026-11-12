'use strict';

// #35 / #107: every streaming link stored so far is a generated SEARCH link (artist + title):
// there was never a UI to paste a real one, and the Catalog seed holds none. Links are now
// pasted by hand (official ones by the curator in the Catalog), so the search links go.
//
// Raw UPDATE on purpose: it leaves updatedAt alone, so clearing the Catalog's links does not
// light up "update available" on every Songlist copy.
// Idempotent (re-run touches nothing). No down: the search links are not worth restoring.
async function clearTable(queryInterface, table) {
  const desc = await queryInterface.describeTable(table);
  if (!desc.streaming_links) return;
  await queryInterface.sequelize.query(
    `UPDATE "${table}" SET streaming_links = NULL WHERE streaming_links IS NOT NULL;`
  );
}

module.exports = {
  async up(queryInterface) {
    await clearTable(queryInterface, 'Songs');
    await clearTable(queryInterface, 'CatalogSongs');
  },

  async down() {
    // no-op — data cleanup, not reverted
  },
};
