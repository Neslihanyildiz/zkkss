const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

// GET /api/logs  (protected)
exports.getLogs = async (req, res) => {
    try {
        const logs = await AuditLog.findAll({
            include: [{ model: User, attributes: ['username'] }],
            order: [['timestamp', 'DESC']]
        });

        const result = logs.map(log => ({
            id:        log.id,
            user_id:   log.user_id,
            username:  log.User ? log.User.username : 'Unknown',
            action:    log.action,
            details:   log.details,
            timestamp: log.timestamp
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Loglar getirilemedi.', details: error.message });
    }
};
