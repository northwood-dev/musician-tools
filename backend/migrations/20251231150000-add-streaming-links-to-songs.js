'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('Songs');
    if (!tableDescription.streaming_links) {
      await queryInterface.addColumn('Songs', 'streaming_links', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Songs', 'streaming_links');
  }
};
