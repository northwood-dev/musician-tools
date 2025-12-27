var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const instrumentController = require('../controllers/instrumentcontroller');
const authsess = require('../middleware/authsess');

router.use(bodyParser.json());

// All instrument routes require authentication
router.get('/', authsess, instrumentController.getAllInstruments);
router.post('/', authsess, instrumentController.createInstrument);
router.put('/:uid', authsess, instrumentController.updateInstrument);
router.delete('/:uid', authsess, instrumentController.deleteInstrument);

module.exports = router;
