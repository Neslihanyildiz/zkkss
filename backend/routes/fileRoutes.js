const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All file routes require a valid JWT
router.use(authMiddleware);

// ── User routes ──────────────────────────────────────────────────────────
router.post('/upload',          upload.single('file'), fileController.uploadFile);
router.get('/list',             fileController.getMyFiles);
router.get('/download/:fileId', fileController.downloadFile);
router.post('/share',           fileController.shareFile);
router.get('/shared',           fileController.getSharedFiles);
router.get('/users',            fileController.getUsers);

// ── Admin / System Manager routes ────────────────────────────────────────
// Only admin and system_manager can see all activity logs
router.get('/logs', role('admin', 'system_manager'), fileController.getLogs);

module.exports = router;
