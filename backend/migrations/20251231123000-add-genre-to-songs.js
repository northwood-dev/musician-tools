'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Songs');
    if (!tableDescription.genre) {
      await queryInterface.addColumn('Songs', 'genre', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Songs', 'genre');
  }
};
