const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const artistAliasController = require('../controllers/artistaliascontroller');
const authsess = require('../middleware/authsess');
const requireCurator = require('../middleware/requirecurator');

router.use(bodyParser.json());

router.get('/', authsess, artistAliasController.listArtistAliases);
router.get('/manage', authsess, requireCurator, artistAliasController.listArtistAliasesWithCounts);
router.post('/', authsess, requireCurator, artistAliasController.createArtistAlias);
router.delete('/:uid', authsess, requireCurator, artistAliasController.deleteArtistAlias);

module.exports = router;
