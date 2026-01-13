const { Song, SongPlay } = require('../models');
const createError = require('http-errors');
const logger = require('../logger');

// GET all songs for logged-in user
const getAllSongs = async (req, res, next) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return next(createError(401, 'Unauthorized'));
    }

    const songs = await Song.findAll({
      where: { userUid: userId },
      order: [['createdAt', 'DESC']]
    });
    res.json(songs);
  } catch (error) {
    logger.error('Error fetching songs:', error);
    next(createError(500, 'Error fetching songs'));
  }
};

// GET single song by uid
const getSong = async (req, res, next) => {
  try {
    const song = await Song.findByPk(req.params.uid);
    if (!song) {
      return next(createError(404, 'Song not found'));
    }
    res.json(song);
  } catch (error) {
    logger.error('Error fetching song:', error);
    next(createError(500, 'Error fetching song'));
  }
};

// POST create new song
const createSong = async (req, res, next) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return next(createError(401, 'Unauthorized'));
    }

    const { title, bpm, key, notes, instrument, artist, album, genre, pitchStandard, instrumentTuning, technique, instrumentLinks, instrumentDifficulty, myInstrumentUid, lastPlayed, streamingLinks, timeSignature, mode } = req.body;

    if (!title) {
      return next(createError(400, 'Title is required'));
    }

    const song = await Song.create({
      userUid: userId,
      title,
      bpm: bpm !== undefined ? bpm : null,
      key,
      notes,
      instrument,
      instrumentLinks,
      instrumentDifficulty,
      instrumentTuning,
      artist,
      album,
      genre,
      pitchStandard,
      technique,
      myInstrumentUid,
      lastPlayed: lastPlayed ? new Date(lastPlayed) : null,
      streamingLinks,
      timeSignature,
      mode
    });

    res.status(201).json(song);
  } catch (error) {
    logger.error('Error creating song:', error);
    next(createError(500, 'Error creating song'));
  }
};

// PUT update song
const updateSong = async (req, res, next) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return next(createError(401, 'Unauthorized'));
    }

    const song = await Song.findByPk(req.params.uid);
    if (!song) {
      return next(createError(404, 'Song not found'));
    }

    // Check ownership
    if (song.userUid !== userId) {
      return next(createError(403, 'Forbidden'));
    }

    const { title, bpm, key, notes, instrument, artist, album, genre, pitchStandard, instrumentTuning, technique, instrumentLinks, instrumentDifficulty, myInstrumentUid, lastPlayed, streamingLinks, timeSignature, mode } = req.body;

    await song.update({
      title: title || song.title,
      bpm: bpm !== undefined ? bpm : song.bpm,
      key: key !== undefined ? key : song.key,
      notes: notes !== undefined ? notes : song.notes,
      instrument: instrument !== undefined ? instrument : song.instrument,
      artist: artist !== undefined ? artist : song.artist,
      album: album !== undefined ? album : song.album,
      genre: genre !== undefined ? genre : song.genre,
      pitchStandard: pitchStandard !== undefined ? pitchStandard : song.pitchStandard,
      instrumentTuning: instrumentTuning !== undefined ? instrumentTuning : song.instrumentTuning,
      technique: technique !== undefined ? technique : song.technique,
      instrumentLinks: instrumentLinks !== undefined ? instrumentLinks : song.instrumentLinks,
      instrumentDifficulty: instrumentDifficulty !== undefined ? instrumentDifficulty : song.instrumentDifficulty,
      lastPlayed: lastPlayed ? new Date(lastPlayed) : song.lastPlayed,
      myInstrumentUid: myInstrumentUid !== undefined ? myInstrumentUid : song.myInstrumentUid,
      streamingLinks: streamingLinks !== undefined ? streamingLinks : song.streamingLinks,
      timeSignature: timeSignature !== undefined ? timeSignature : song.timeSignature,
      mode: mode !== undefined ? mode : song.mode
    });

    res.json(song);
  } catch (error) {
    logger.error('Error updating song:', error);
    next(createError(500, 'Error updating song'));
  }
};

// DELETE song
const deleteSong = async (req, res, next) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return next(createError(401, 'Unauthorized'));
    }

    const song = await Song.findByPk(req.params.uid);
    if (!song) {
      return next(createError(404, 'Song not found'));
    }

    // Check ownership
    if (song.userUid !== userId) {
      return next(createError(403, 'Forbidden'));
    }

    await song.destroy();
    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    logger.error('Error deleting song:', error);
    next(createError(500, 'Error deleting song'));
  }
};

// POST mark song as played
const markSongPlayed = async (req, res, next) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return next(createError(401, 'Unauthorized'));
    }

    const song = await Song.findByPk(req.params.uid);
    if (!song) {
      return next(createError(404, 'Song not found'));
    }

    // Check ownership
    if (song.userUid !== userId) {
      return next(createError(403, 'Forbidden'));
    }

    const { instrumentUid, instrumentType } = req.body;

    const songPlay = await SongPlay.create({
      songUid: song.uid,
      instrumentUid: instrumentUid || null,
      instrumentType: instrumentType || null,
      playedAt: new Date(),
    });

    // Also update the song's lastPlayed field as a fallback
    await song.update({ lastPlayed: new Date() });

    res.status(201).json(songPlay);
  } catch (error) {
    logger.error('Error marking song as played:', error);
    next(createError(500, 'Error marking song as played'));
  }
};

// GET song plays history
const getSongPlays = async (req, res, next) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return next(createError(401, 'Unauthorized'));
    }

    const song = await Song.findByPk(req.params.uid);
    if (!song) {
      return next(createError(404, 'Song not found'));
    }

    // Check ownership
    if (song.userUid !== userId) {
      return next(createError(403, 'Forbidden'));
    }

    const plays = await SongPlay.findAll({
      where: { songUid: song.uid },
      order: [['playedAt', 'DESC']],
    });

    res.json(plays);
  } catch (error) {
    logger.error('Error fetching song plays:', error);
    next(createError(500, 'Error fetching song plays'));
  }
};

module.exports = {
  getAllSongs,
  getSong,
  createSong,
  updateSong,
  deleteSong,
  markSongPlayed,
  getSongPlays,
};
