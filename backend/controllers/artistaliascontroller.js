'use strict';

const createError = require('http-errors');
const { ArtistAlias } = require('../models');
const logger = require('../logger');
const { isUuid } = require('../utils/uuid');
const { sameAlias, searchKey } = require('../utils/songIdentity');

const MAX_LENGTH = 255; // the columns' size

// GET /api/artist-aliases — any signed-in user: the Songlist search compares in the browser.
const listArtistAliases = async (req, res, next) => {
  try {
    const aliases = await ArtistAlias.findAll({
      attributes: ['uid', 'alias', 'artist'],
      order: [['alias', 'ASC']],
    });
    res.json(aliases);
  } catch (error) {
    logger.error('Error listing artist aliases:', error);
    next(createError(500, 'Error listing artist aliases'));
  }
};

// GET /api/artist-aliases/manage — curators: each alias with the Catalog entries it finds,
// drafts included, so that a renamed artist doesn't leave a silently broken alias. Same match
// as the Catalog search.
const listArtistAliasesWithCounts = async (req, res, next) => {
  try {
    const aliases = await ArtistAlias.sequelize.query(`
      SELECT a.uid, a.alias, a.artist,
             (SELECT count(*)::int FROM "CatalogSongs" c
               WHERE f_search_key(c.artist) LIKE '%' || f_search_key(f_artist_key(a.artist)) || '%') AS "entryCount"
        FROM "ArtistAliases" a
       ORDER BY lower(a.alias)
    `, { type: 'SELECT' });
    res.json(aliases);
  } catch (error) {
    logger.error('Error listing artist aliases with counts:', error);
    next(createError(500, 'Error listing artist aliases'));
  }
};

// A value with no search key could never be found, and all of them would collide.
function parseAliasField(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  const usable = searchKey(text) !== '' && text.length <= MAX_LENGTH && !text.includes(String.fromCharCode(0));
  return usable ? text : null;
}

// POST /api/artist-aliases — curators. Body: { alias, artist }. The unique index on
// f_search_key(alias) decides duplicates: "r.h.c.p" is "RHCP".
const createArtistAlias = async (req, res, next) => {
  const alias = parseAliasField(req.body?.alias);
  const artist = parseAliasField(req.body?.artist);
  if (!alias || !artist) return next(createError(400, 'An alias and an artist are required'));

  try {
    const created = await ArtistAlias.create({ alias, artist });
    return res.status(201).json(created);
  } catch (error) {
    if (error && error.name === 'SequelizeUniqueConstraintError') {
      const existing = await ArtistAlias.findOne({ where: sameAlias(alias) }).catch(() => null);
      return res.status(409).json({
        error: 'duplicate_alias',
        message: 'This alias already exists',
        alias: existing,
      });
    }
    logger.error('Error creating an artist alias:', error);
    return next(createError(500, 'Error creating the artist alias'));
  }
};

// DELETE /api/artist-aliases/:uid — curators.
const deleteArtistAlias = async (req, res, next) => {
  if (!isUuid(req.params.uid)) return next(createError(404, 'Artist alias not found'));
  try {
    const removed = await ArtistAlias.destroy({ where: { uid: req.params.uid } });
    if (!removed) return next(createError(404, 'Artist alias not found'));
    return res.status(204).end();
  } catch (error) {
    logger.error('Error deleting an artist alias:', error);
    return next(createError(500, 'Error deleting the artist alias'));
  }
};

module.exports = { listArtistAliases, listArtistAliasesWithCounts, createArtistAlias, deleteArtistAlias };
