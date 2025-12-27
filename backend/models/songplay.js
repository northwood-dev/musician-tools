'use strict';

module.exports = (sequelize, DataTypes) => {
  const SongPlay = sequelize.define('SongPlay', {
    uid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    songUid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    instrumentUid: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    instrumentType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    playedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {});

  SongPlay.associate = function(models) {
    SongPlay.belongsTo(models.Song, { foreignKey: 'songUid' });
    SongPlay.belongsTo(models.Instrument, { foreignKey: 'instrumentUid' });
  };

  return SongPlay;
};
