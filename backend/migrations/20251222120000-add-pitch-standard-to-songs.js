'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Songs');
    if (!tableDescription.pitch_standard) {
      await queryInterface.addColumn('Songs', 'pitch_standard', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 440,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Songs', 'pitch_standard');
  },
};
