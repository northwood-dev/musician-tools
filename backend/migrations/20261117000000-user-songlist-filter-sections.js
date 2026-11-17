'use strict';

// #198: the Songlist sidebar layout (which filter sections, in which order) is saved on the
// account. Nullable: NULL = never customised → the default layout. Additive, no data touched.
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('Users');
    if (desc.songlist_filter_sections) return;
    await queryInterface.addColumn('Users', 'songlist_filter_sections', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('Users');
    if (!desc.songlist_filter_sections) return;
    await queryInterface.removeColumn('Users', 'songlist_filter_sections');
  },
};
