const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getAllUser, updateUser, deleteUser } = require('../Controllers/Auth');
const verification = require('../middlewere/middlewere');

router.post('/loginUser', loginUser);
router.post('/registerUser', verification, registerUser);
router.get('/getalluser', verification, getAllUser);
router.put('/updateUser/:id', verification, updateUser);
router.delete('/deleteUser/:id', verification, deleteUser);

module.exports = router;
