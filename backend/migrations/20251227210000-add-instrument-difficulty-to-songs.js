'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('Songs');
    if (!tableDescription.instrumentDifficulty) {
      await queryInterface.addColumn('Songs', 'instrumentDifficulty', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Songs', 'instrumentDifficulty');
  }
};
