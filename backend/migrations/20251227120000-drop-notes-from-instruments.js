'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Instruments', 'notes');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Instruments', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  }
};
