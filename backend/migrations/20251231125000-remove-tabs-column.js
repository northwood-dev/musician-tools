'use strict';

module.exports = {
  async up(queryInterface) {
    const tableDescription = await queryInterface.describeTable('Songs');
    if (tableDescription.tabs) {
      await queryInterface.removeColumn('Songs', 'tabs');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('Songs', 'tabs', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  }
};
