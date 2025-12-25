const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Dosya Yükleme Ayarları ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- Veritabanı Bağlantısı (GÜNCELLENDİ) ---
// Artık bağlanınca konsola bilgi verecek
const db = new sqlite3.Database('./project.db', (err) => {
    if (err) {
        console.error("Veritabanı hatası:", err.message);
    } else {
        console.log('Veritabanına bağlanıldı.');
    }
});

db.serialize(() => {
    // 1. Users (Public Key eklendi)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        public_key TEXT -- YENİ: Başkaları dosya gönderebilsin diye
    )`);

    // 2. Files
    db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        filename TEXT,
        path TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 3. File Shares (YENİ: Paylaşım Tablosu)
    db.run(`CREATE TABLE IF NOT EXISTS file_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        from_user_id INTEGER,
        to_user_id INTEGER,
        encrypted_key TEXT, -- Alıcı için şifrelenmiş AES anahtarı
        FOREIGN KEY(file_id) REFERENCES files(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

const logActivity = (userId, action, details) => {
    db.run(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)`, [userId, action, details], (err) => {});
};

// --- API'ler ---

// 1. Kayıt Ol (Public Key ile)
app.post('/api/register', async (req, res) => {
    const { username, password, publicKey } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, password, public_key) VALUES (?, ?, ?)`, 
            [username, hashedPassword, publicKey], function(err) {
            if (err) return res.status(400).json({ error: "Kullanıcı adı alınmış." });
            logActivity(this.lastID, "REGISTER", "Kullanıcı sisteme katıldı.");
            res.json({ id: this.lastID, message: "Kayıt başarılı." });
        });
    } catch (err) { res.status(500).json({ error: "Hata" }); }
});

// 2. Giriş
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, row) => {
        if (err || !row) return res.status(401).json({ error: "Bulunamadı" });
        const match = await bcrypt.compare(password, row.password);
        if (match) {
            logActivity(row.id, "LOGIN", "Oturum açıldı.");
            res.json({ message: "Giriş başarılı", user: row });
        } else {
            res.status(401).json({ error: "Şifre hatalı" });
        }
    });
});

// 3. Kullanıcı Listesini Getir (Kendisi hariç)
app.get('/api/users-list/:myId', (req, res) => {
    const myId = req.params.myId;
    db.all(`SELECT id, username, public_key FROM users WHERE id != ?`, [myId], (err, rows) => {
        res.json(rows);
    });
});

// 4. Dosya Paylaş (Anahtar Transferi)
app.post('/api/share', (req, res) => {
    const { fileId, fromUserId, toUserId, encryptedKey } = req.body;
    
    // Zaten paylaşılmış mı kontrol et
    db.get(`SELECT * FROM file_shares WHERE file_id = ? AND to_user_id = ?`, [fileId, toUserId], (err, row) => {
        if (row) return res.status(400).json({ error: "Bu dosya zaten bu kişiyle paylaşılmış." });

        db.run(`INSERT INTO file_shares (file_id, from_user_id, to_user_id, encrypted_key) VALUES (?, ?, ?, ?)`,
            [fileId, fromUserId, toUserId, encryptedKey], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                logActivity(fromUserId, "FILE_SHARE", `Dosya Paylaşıldı (FileID: #${fileId} -> UserID: ${toUserId})`);
                res.json({ message: "Dosya güvenle paylaşıldı." });
            });
    });
});

// 5. Bana Paylaşılan Dosyaları Getir
app.get('/api/shared-files/:userId', (req, res) => {
    const userId = req.params.userId;
    const sql = `
        SELECT files.id, files.filename, files.upload_date, users.username as sender_name, file_shares.encrypted_key 
        FROM file_shares
        JOIN files ON file_shares.file_id = files.id
        JOIN users ON file_shares.from_user_id = users.id
        WHERE file_shares.to_user_id = ?
    `;
    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 6. Dosya Yükle
app.post('/api/upload', upload.single('encryptedFile'), (req, res) => {
    const userId = req.body.userId; 
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Dosya yok." });

    db.run(`INSERT INTO files (user_id, filename, path) VALUES (?, ?, ?)`,
        [userId, file.originalname, file.path], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const fileId = this.lastID;
            logActivity(userId, "FILE_UPLOAD", `Dosya yüklendi (Ref_ID: #${fileId})`);
            res.json({ message: "Yüklendi.", fileId: fileId });
        });
});

// 7. Dosyalarım
app.get('/api/files/:userId', (req, res) => {
    db.all(`SELECT id, filename, upload_date FROM files WHERE user_id = ?`, [req.params.userId], (err, rows) => res.json(rows));
});

// 8. İndir (Güvenlik kontrolü gevşetildi: Sahibi VEYA Paylaşılan Kişi indirebilir)
app.get('/api/download/:fileId', (req, res) => {
    const fileId = req.params.fileId;
    db.get(`SELECT * FROM files WHERE id = ?`, [fileId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Dosya yok." });
        logActivity(row.user_id, "FILE_DOWNLOAD", `Dosya indirildi (Ref_ID: #${fileId})`);
        res.download(row.path, row.filename);
    });
});

// 9. Loglar
app.get('/api/logs', (req, res) => {
    db.all(`SELECT activity_logs.*, users.username FROM activity_logs LEFT JOIN users ON activity_logs.user_id = users.id ORDER BY timestamp DESC`, [], (err, rows) => res.json(rows));
});

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));