"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Rename column 'chords' to 'notes' in Songs
    await queryInterface.renameColumn("Songs", "chords", "notes");
  },

  async down(queryInterface, Sequelize) {
    // Revert column name 'notes' back to 'chords'
    await queryInterface.renameColumn("Songs", "notes", "chords");
  },
};
