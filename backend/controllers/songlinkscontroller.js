const { Song } = require('../models');
const createError = require('http-errors');
const logger = require('../logger');

// Generate streaming links based on artist and title
const generateStreamingLinks = async (req, res, next) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return next(createError(401, 'Unauthorized'));
    }

    const song = await Song.findByPk(req.params.uid);
    if (!song) {
      return next(createError(404, 'Song not found'));
    }

    if (song.userUid !== userId) {
      return next(createError(403, 'Forbidden'));
    }

    const artist = (song.artist || '').trim();
    const title = (song.title || '').trim();
    
    if (!artist || !title) {
      return next(createError(400, 'Artist and title are required'));
    }

    const searchQuery = `${artist} ${title}`;
    const encodedQuery = encodeURIComponent(searchQuery);

    const links = [
      {
        platform: 'YouTube',
        url: `https://www.youtube.com/results?search_query=${encodedQuery}`,
        label: 'YouTube'
      },
      {
        platform: 'Spotify',
        url: `https://open.spotify.com/search/${encodedQuery}`,
        label: 'Spotify'
      },
      {
        platform: 'Apple Music',
        url: `https://music.apple.com/us/search?term=${encodedQuery}`,
        label: 'Apple Music'
      },
      {
        platform: 'Deezer',
        url: `https://www.deezer.com/search/${encodedQuery}`,
        label: 'Deezer'
      },
      {
        platform: 'Tidal',
        url: `https://tidal.com/search?q=${encodedQuery}&types=TRACKS`,
        label: 'Tidal'
      },
      {
        platform: 'Qobuz',
        url: `https://www.qobuz.com/us-en/search?q=${encodedQuery}`,
        label: 'Qobuz'
      }
    ];

    res.json({ links });
  } catch (error) {
    logger.error('Error generating streaming links:', error);
    next(createError(500, 'Error generating streaming links'));
  }
};

module.exports = {
  generateStreamingLinks
};
