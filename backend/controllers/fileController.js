const File = require('../models/File');
const FileShare = require('../models/FileShare');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { Op } = require('sequelize');
const path = require('path');

// POST /api/files/upload  (protected)
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Hiçbir dosya yüklenmedi.' });
        }

        const newFile = await File.create({
            user_id: req.user.id,
            filename: req.file.originalname,
            path: req.file.path
        });

        await AuditLog.create({
            user_id: req.user.id,
            action: 'FILE_UPLOAD',
            details: `${req.user.username}, '${req.file.originalname}' dosyasını yükledi.`
        });

        res.status(201).json({ message: 'Yüklendi.', fileId: newFile.id });
    } catch (error) {
        res.status(500).json({ error: 'Dosya kaydı sırasında hata oluştu.', details: error.message });
    }
};

// GET /api/files/list  (protected — userId comes from token, not URL)
exports.getMyFiles = async (req, res) => {
    try {
        const files = await File.findAll({
            where: { user_id: req.user.id },
            attributes: ['id', 'filename', 'upload_date'],
            order: [['upload_date', 'DESC']]
        });
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Dosyalar getirilemedi.' });
    }
};

// GET /api/files/download/:fileId  (protected + ownership check via ownershipMiddleware)
exports.downloadFile = async (req, res) => {
    try {
        // ownershipMiddleware already verified ownership and attached req.file_record
        const file = req.file_record;

        await AuditLog.create({
            user_id: req.user.id,
            action: 'FILE_DOWNLOAD',
            details: `${req.user.username} '${file.filename}' dosyasını indirdi.`
        });

        res.download(file.path, file.filename);
    } catch (error) {
        res.status(500).json({ error: 'İndirme sırasında hata oluştu.' });
    }
};

// POST /api/files/share  (protected)
// Body: { fileId, toUserId, encryptedKey }
// fromUserId is taken from the JWT — never trust the client for this
exports.shareFile = async (req, res) => {
    try {
        const { fileId, toUserId, encryptedKey } = req.body;
        const fromUserId = req.user.id; // IDOR: must come from token

        // Verify the sharer actually owns the file
        const file = await File.findOne({ where: { id: fileId, user_id: fromUserId } });
        if (!file) {
            return res.status(403).json({ error: 'Bu dosyayı paylaşma yetkiniz yok.' });
        }

        // Prevent duplicate share
        const existing = await FileShare.findOne({ where: { file_id: fileId, to_user_id: toUserId } });
        if (existing) {
            return res.status(400).json({ error: 'Bu dosya zaten bu kişiyle paylaşılmış.' });
        }

        await FileShare.create({ file_id: fileId, from_user_id: fromUserId, to_user_id: toUserId, encrypted_key: encryptedKey });

        await AuditLog.create({
            user_id: fromUserId,
            action: 'FILE_SHARE',
            details: `${req.user.username} dosyayı paylaştı (FileID: #${fileId} -> UserID: ${toUserId})`
        });

        res.json({ message: 'Dosya güvenle paylaşıldı.' });
    } catch (error) {
        res.status(500).json({ error: 'Paylaşım sırasında hata oluştu.', details: error.message });
    }
};

// GET /api/files/shared  (protected — shows files shared WITH the current user)
exports.getSharedFiles = async (req, res) => {
    try {
        const shares = await FileShare.findAll({
            where: { to_user_id: req.user.id },
            include: [
                { model: File,                        attributes: ['id', 'filename', 'upload_date'] },
                { model: User, as: 'sender',          attributes: ['id', 'username'] }
            ]
        });

        const result = shares.map(s => ({
            id:           s.File.id,
            filename:     s.File.filename,
            upload_date:  s.File.upload_date,
            sender_name:  s.sender.username,
            from_user_id: s.from_user_id,
            to_user_id:   s.to_user_id,
            encrypted_key: s.encrypted_key
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Paylaşılan dosyalar getirilemedi.', details: error.message });
    }
};

// GET /api/users/list  (protected — returns all users except the current one)
exports.getUsersList = async (req, res) => {
    try {
        const users = await User.findAll({
            where: { id: { [Op.ne]: req.user.id } },
            attributes: ['id', 'username', 'public_key']
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Kullanıcı listesi getirilemedi.' });
    }
};
