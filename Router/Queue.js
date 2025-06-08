const express = require('express');
const router = express.Router();
const { getLocketData, saveLocketData, getAllLocketData, getWeekLocketData, getFilterLocketData } = require('../Controllers/Queue');
const verification = require('../middlewere/middlewere');

router.get('/getLocketData/:locket', verification, getLocketData);
router.post('/saveLocketData', verification, saveLocketData);
router.get('/getAllLocketData', getAllLocketData);
router.get('/getWeekLocketData', getWeekLocketData);
router.get('/getFilterLocketData', getFilterLocketData);

module.exports = router;
