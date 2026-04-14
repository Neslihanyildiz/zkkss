const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All file routes require a valid JWT
router.use(authMiddleware);

router.post('/upload',             upload.single('file'), fileController.uploadFile);
router.get('/list',                fileController.getMyFiles);
router.get('/download/:fileId',    fileController.downloadFile);
router.post('/share',              fileController.shareFile);
router.get('/shared',              fileController.getSharedFiles);
router.get('/users',               fileController.getUsers);
router.get('/logs',                fileController.getLogs);

module.exports = router;
