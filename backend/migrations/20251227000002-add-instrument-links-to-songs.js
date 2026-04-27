'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('Songs');
    if (!tableDescription.instrumentLinks) {
      await queryInterface.addColumn('Songs', 'instrumentLinks', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Songs', 'instrumentLinks');
  }
};
