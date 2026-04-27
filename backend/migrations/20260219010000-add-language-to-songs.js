'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('Songs');
    if (!tableDescription.language) {
      await queryInterface.addColumn('Songs', 'language', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Songs', 'language');
  }
};
