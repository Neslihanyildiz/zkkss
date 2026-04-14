const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');
const ownershipMiddleware = require('../middleware/ownershipMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All file routes require a valid JWT
router.use(authMiddleware);

// POST /api/files/upload
router.post('/upload', upload.single('encryptedFile'), fileController.uploadFile);

// GET /api/files/list
router.get('/list', fileController.getMyFiles);

// GET /api/files/download/:fileId  — ownershipMiddleware blocks IDOR
router.get('/download/:fileId', ownershipMiddleware, fileController.downloadFile);

// POST /api/files/share
router.post('/share', fileController.shareFile);

// GET /api/files/shared
router.get('/shared', fileController.getSharedFiles);

module.exports = router;
