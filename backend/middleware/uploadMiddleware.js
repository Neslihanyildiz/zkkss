const multer = require('multer');

// Disk yerine memory'e al — Supabase'e buffer olarak göndereceğiz
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

module.exports = upload;