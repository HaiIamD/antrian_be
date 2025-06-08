const express = require('express');
const router = express.Router();
const { getSlider, saveSlider, getFile } = require('../Controllers/File');
const verification = require('../middlewere/middlewere');

router.post('/saveSlider', verification, saveSlider);
router.get('/getSlider', getSlider);
router.get('/getFile', getFile);

module.exports = router;
