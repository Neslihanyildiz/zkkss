const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Dosya Yükle (Sadece giriş yapmış kullanıcılar)
// 'file' kelimesi frontend formundaki input name="file" ile aynı olmalı
router.post('/upload', authMiddleware, upload.single('file'), fileController.uploadFile);

// Dosyalarımı Listele
router.get('/list', authMiddleware, fileController.getMyFiles);

module.exports = router;