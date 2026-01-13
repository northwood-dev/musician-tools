'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Songs', 'time_signature', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Songs', 'mode', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Songs', 'time_signature');
    await queryInterface.removeColumn('Songs', 'mode');
  },
};
