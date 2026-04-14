/**
 * Role Middleware — must run AFTER authMiddleware (req.user must be set).
 *
 * Usage:
 *   router.get('/admin/users', authMiddleware, role('admin', 'system_manager'), controller)
 *
 * Roles (least → most privileged):
 *   'user'           → regular account, file operations only
 *   'admin'          → + view all users and all audit logs
 *   'system_manager' → + change user roles, delete users
 */
module.exports = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Kimlik doğrulanmadı.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            error: 'Bu işlem için yetkiniz yok.',
            required: allowedRoles,
            yours: req.user.role ?? 'user'
        });
    }
    next();
};
