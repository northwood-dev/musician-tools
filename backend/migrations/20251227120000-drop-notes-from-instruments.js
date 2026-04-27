'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Instruments');
    if (tableDescription.notes) {
      await queryInterface.removeColumn('Instruments', 'notes');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Instruments', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  }
};
