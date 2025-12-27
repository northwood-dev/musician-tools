'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Songs', 'my_instrument_uid', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Instruments',
        key: 'uid'
      },
      onDelete: 'SET NULL'
    });
    await queryInterface.addIndex('Songs', ['my_instrument_uid']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Songs', 'my_instrument_uid');
  }
};
