'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Songs');
    if (!tableDescription.tunning) {
      await queryInterface.addColumn('Songs', 'tunning', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Songs', 'tunning');
  },
};
