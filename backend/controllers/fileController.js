const File = require('../models/File');
const AuditLog = require('../models/AuditLog'); // Log modelini çağırdık

// --- DOSYA YÜKLEME ---
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Hiçbir dosya yüklenmedi.' });
        }

        const newFile = await File.create({
            filename: req.file.filename,
            original_name: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            owner_id: req.user.id
        });

        // LOGLAMA: Dosya yükleme işlemi
        await AuditLog.create({
            user_id: req.user.id,
            action: 'UPLOAD',
            details: `${req.user.username}, '${req.file.originalname}' dosyasını yükledi.`,
            ip_address: req.ip
        });

        res.status(201).json({ 
            message: 'Dosya başarıyla yüklendi.', 
            file: newFile 
        });

    } catch (error) {
        res.status(500).json({ error: 'Dosya kaydı sırasında hata oluştu.', details: error.message });
    }
};

// --- DOSYALARI LİSTELEME ---
exports.getMyFiles = async (req, res) => {
    try {
        const files = await File.findAll({ where: { owner_id: req.user.id } });
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Dosyalar getirilemedi.' });
    }
};