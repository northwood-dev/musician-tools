var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const songController = require('../controllers/songcontroller');
const authsess = require('../middleware/authsess');

router.use(bodyParser.json());

// All song routes require authentication
router.get('/', authsess, songController.getAllSongs);
router.get('/lookup', authsess, songController.lookupSongMetadata);
// #244 — each song's latest play per instrument, in one request (static path: before /:uid).
router.get('/last-plays', authsess, songController.getLastPlays);
// #71: one instrument on several of the user's songs, all or none.
router.post('/bulk/instrument', authsess, songController.addInstrumentToSongs);
router.get('/:uid', authsess, songController.getSong);
// Story 21.1 — refresh a Catalog copy to the current Catalog version (writes the user's
// own Song → authsess only ; CSRF app-wide covers it).
router.post('/:uid/refresh-from-catalog', authsess, songController.refreshSongFromCatalog);
// #235 — keep the user's own values: stamps the copy with the entry's current version.
router.post('/:uid/keep-mine', authsess, songController.keepSongValues);
router.post('/', authsess, songController.createSong);
router.put('/:uid', authsess, songController.updateSong);
router.delete('/:uid', authsess, songController.deleteSong);
router.post('/:uid/plays', authsess, songController.markSongPlayed);
router.get('/:uid/plays', authsess, songController.getSongPlays);

module.exports = router;
