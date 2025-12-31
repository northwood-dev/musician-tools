'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('Songs', 'tabs');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('Songs', 'tabs', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  }
};
