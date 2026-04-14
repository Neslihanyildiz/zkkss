const File = require('../models/File');
const FileShare = require('../models/FileShare');

/**
 * IDOR Prevention Middleware
 *
 * Must run AFTER authMiddleware (req.user must already be set).
 * Allows access to a file if the authenticated user is either:
 *   (a) the file's owner, OR
 *   (b) a recipient of a share for that file
 *
 * Usage:  router.get('/download/:fileId', authMiddleware, ownershipMiddleware, controller)
 */
module.exports = async (req, res, next) => {
    try {
        const fileId = parseInt(req.params.fileId, 10);
        if (isNaN(fileId)) {
            return res.status(400).json({ error: 'Geçersiz dosya ID.' });
        }

        const file = await File.findByPk(fileId);
        if (!file) {
            return res.status(404).json({ error: 'Dosya bulunamadı.' });
        }

        // Allow if the authenticated user owns the file
        if (file.user_id === req.user.id) {
            req.file_record = file;
            return next();
        }

        // Also allow if the file was explicitly shared with this user
        const share = await FileShare.findOne({
            where: { file_id: fileId, to_user_id: req.user.id }
        });
        if (share) {
            req.file_record = file;
            return next();
        }

        return res.status(403).json({ error: 'Bu dosyaya erişim yetkiniz yok.' });
    } catch (error) {
        res.status(500).json({ error: 'Sahiplik doğrulaması başarısız.', details: error.message });
    }
};
