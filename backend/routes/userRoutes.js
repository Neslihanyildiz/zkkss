const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/users/list  (protected — returns all users except current user)
router.get('/list', authMiddleware, fileController.getUsersList);

module.exports = router;
