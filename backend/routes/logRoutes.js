const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/logs  (protected)
router.get('/', authMiddleware, logController.getLogs);

module.exports = router;
