const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST isteği: http://localhost:3000/api/auth/register
router.post('/register', authController.register);

// POST isteği: http://localhost:3000/api/auth/login
router.post('/login', authController.login);

module.exports = router;