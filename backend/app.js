const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// --- Middleware Ayarları ---
app.use(cors()); // Frontend'den gelen isteklere izin ver
app.use(express.json()); // Gelen JSON verilerini okuyabil
app.use(express.urlencoded({ extended: true }));

// --- Statik Dosyalar (Opsiyonel) ---
// Yüklenen dosyaları dışarı açmak istersek burayı kullanacağız (Şimdilik kapalı kalabilir)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Test Rotası ---
app.get('/', (req, res) => {
    res.json({ message: 'Zero-Knowledge Storage API Çalışıyor! 🚀' });
});

// --- Rotalar (API Uç Noktaları) ---
app.use('/api/auth', require('./routes/authRoutes')); // Kayıt ol, Giriş yap
app.use('/api/files', require('./routes/fileRoutes')); // Dosya Yükle, Listele

module.exports = app;