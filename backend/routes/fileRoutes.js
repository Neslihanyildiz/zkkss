const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/upload', authMiddleware, upload.single('file'), fileController.uploadFile);
router.get('/list', authMiddleware, fileController.getMyFiles);
router.get('/download/:fileId', authMiddleware, fileController.downloadFile);
router.post('/share', authMiddleware, fileController.shareFile);
router.get('/shared', authMiddleware, fileController.getSharedFiles);
router.get('/users', authMiddleware, fileController.getUsers);
router.get('/logs', authMiddleware, fileController.getLogs);

module.exports = router;