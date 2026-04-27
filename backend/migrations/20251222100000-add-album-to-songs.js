'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Songs');
    if (!tableDescription.album) {
      await queryInterface.addColumn('Songs', 'album', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Songs', 'album');
  },
};
