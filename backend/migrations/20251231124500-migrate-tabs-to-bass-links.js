'use strict';

module.exports = {
  async up(queryInterface) {
    const [songs] = await queryInterface.sequelize.query(`
      SELECT "uid", "tabs", "instrumentLinks"
      FROM "Songs"
      WHERE "tabs" IS NOT NULL AND TRIM("tabs") <> ''
    `);

    for (const song of songs) {
      const url = (song.tabs || '').trim();
      if (!url) continue;

      const links = song.instrumentLinks || {};
      const bassLinks = Array.isArray(links.Bass) ? links.Bass : [];
      const already = bassLinks.some(l => (l && typeof l.url === 'string' ? l.url.trim() : '') === url);
      if (!already) {
        bassLinks.push({ label: 'Tabs videos', url });
      }
      const nextLinks = { ...links, Bass: bassLinks };

      await queryInterface.sequelize.query(
        'UPDATE "Songs" SET "instrumentLinks" = :links WHERE "uid" = :uid',
        {
          replacements: {
            links: JSON.stringify(nextLinks),
            uid: song.uid,
          },
          type: queryInterface.sequelize.QueryTypes.UPDATE,
        }
      );
    }
  },

  async down(queryInterface) {
    const [songs] = await queryInterface.sequelize.query(`
      SELECT "uid", "tabs", "instrumentLinks"
      FROM "Songs"
      WHERE "instrumentLinks" IS NOT NULL
    `);

    for (const song of songs) {
      const url = (song.tabs || '').trim();
      const links = song.instrumentLinks || {};
      if (!links.Bass || !Array.isArray(links.Bass)) continue;

      const filtered = links.Bass.filter(l => {
        const linkUrl = l && typeof l.url === 'string' ? l.url.trim() : '';
        const label = l && l.label;
        // remove only the entry we added
        return !(linkUrl === url && label === 'Tabs videos');
      });

      const nextLinks = { ...links };
      if (filtered.length === 0) {
        delete nextLinks.Bass;
      } else {
        nextLinks.Bass = filtered;
      }

      await queryInterface.sequelize.query(
        'UPDATE "Songs" SET "instrumentLinks" = :links WHERE "uid" = :uid',
        {
          replacements: {
            links: JSON.stringify(nextLinks),
            uid: song.uid,
          },
          type: queryInterface.sequelize.QueryTypes.UPDATE,
        }
      );
    }
  }
};
