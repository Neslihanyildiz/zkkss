const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Uploads klasörü yoksa oluştur
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Depolama ayarları
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Dosyalar buraya kaydedilecek
    },
    filename: (req, file, cb) => {
        // Dosya isminin çakışmaması için sonuna tarih ekliyoruz
        // Örn: my-file.png -> 163456789-my-file.png
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

module.exports = upload;