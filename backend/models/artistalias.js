'use strict';

// #76: "RHCP" also searches for "Red Hot Chili Peppers". Shared by everyone and only used by
// search, never to decide that two songs are the same. The artist is free text because there
// is no artist table. One alias, one artist is enforced by a FUNCTIONAL unique index on
// f_search_key(alias), created in migration 20261109100000. It is not expressible via the
// Sequelize `indexes` DSL, so it is intentionally NOT declared here.
//
// Not to be confused with the Catalog seed script's "aliases": one-off spelling corrections.
module.exports = (sequelize, DataTypes) => {
  const ArtistAlias = sequelize.define('ArtistAlias', {
    uid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    alias: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    artist: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'ArtistAliases',
    timestamps: true,
  });

  return ArtistAlias;
};
