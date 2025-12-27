'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('SongPlays', {
      uid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      songUid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Songs',
          key: 'uid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      instrumentUid: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Instruments',
          key: 'uid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      playedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('SongPlays', ['songUid']);
    await queryInterface.addIndex('SongPlays', ['instrumentUid']);
    await queryInterface.addIndex('SongPlays', ['playedAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('SongPlays');
  },
};
