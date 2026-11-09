'use strict';

const createError = require('http-errors');
const { ArtistAlias } = require('../models');
const logger = require('../logger');

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

module.exports = { listArtistAliases };
