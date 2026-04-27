'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('SongPlays');
    if (!tableDescription.instrumentType) {
      await queryInterface.addColumn('SongPlays', 'instrumentType', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('SongPlays', 'instrumentType');
  }
};
