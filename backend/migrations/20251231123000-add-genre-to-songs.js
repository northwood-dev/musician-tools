'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Songs', 'genre', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Songs', 'genre');
  }
};
