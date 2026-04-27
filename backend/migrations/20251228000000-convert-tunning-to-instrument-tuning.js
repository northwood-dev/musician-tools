'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop old tunning column and add new instrumentTuning JSON column
    const tableDescription = await queryInterface.describeTable('Songs');
    if (tableDescription.tunning) {
      await queryInterface.removeColumn('Songs', 'tunning');
    }
    if (!tableDescription.instrumentTuning) {
      await queryInterface.addColumn('Songs', 'instrumentTuning', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Reverse: add back tunning column and remove instrumentTuning
    await queryInterface.removeColumn('Songs', 'instrumentTuning');
    await queryInterface.addColumn('Songs', 'tunning', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};
