const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const artistAliasController = require('../controllers/artistaliascontroller');
const authsess = require('../middleware/authsess');

router.use(bodyParser.json());

router.get('/', authsess, artistAliasController.listArtistAliases);

module.exports = router;
