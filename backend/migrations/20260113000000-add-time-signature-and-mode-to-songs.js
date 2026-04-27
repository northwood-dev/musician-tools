'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Songs');
    if (!tableDescription.time_signature) {
      await queryInterface.addColumn('Songs', 'time_signature', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!tableDescription.mode) {
      await queryInterface.addColumn('Songs', 'mode', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Songs', 'time_signature');
    await queryInterface.removeColumn('Songs', 'mode');
  },
};
