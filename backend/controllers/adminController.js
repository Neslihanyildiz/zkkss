const supabase = require('../config/supabase');

const VALID_ROLES = ['user', 'admin', 'system_manager'];

// GET /api/admin/users  (admin+)
// Returns all users with their roles (no password hashes)
exports.getAllUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, role, public_key')
            .order('id');

        if (error) throw error;

        res.json(data.map(u => ({
            id:       u.id,
            username: u.username,
            role:     u.role ?? 'user',
            has_key:  !!u.public_key
        })));
    } catch (error) {
        res.status(500).json({ error: 'Kullanıcılar getirilemedi.', details: error.message });
    }
};

// PATCH /api/admin/users/:id/role  (system_manager only)
// Body: { role: 'user' | 'admin' | 'system_manager' }
exports.updateUserRole = async (req, res) => {
    try {
        const targetId = parseInt(req.params.id, 10);
        const { role } = req.body;

        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({
                error: 'Geçersiz rol. Geçerli roller: ' + VALID_ROLES.join(', ')
            });
        }

        // Prevent demoting yourself
        if (targetId === req.user.id) {
            return res.status(400).json({ error: 'Kendi rolünüzü değiştiremezsiniz.' });
        }

        const { error } = await supabase
            .from('users')
            .update({ role })
            .eq('id', targetId);

        if (error) throw error;

        await supabase.from('activity_logs').insert({
            user_id: req.user.id,
            action: 'ROLE_CHANGE',
            details: `${req.user.username} kullanıcı #${targetId} rolünü '${role}' olarak değiştirdi.`,
            ip_address: req.ip
        });

        res.json({ message: `Rol başarıyla '${role}' olarak güncellendi.` });
    } catch (error) {
        res.status(500).json({ error: 'Rol güncellenemedi.', details: error.message });
    }
};

// DELETE /api/admin/users/:id  (system_manager only)
exports.deleteUser = async (req, res) => {
    try {
        const targetId = parseInt(req.params.id, 10);

        if (targetId === req.user.id) {
            return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz.' });
        }

        const { data: target } = await supabase
            .from('users')
            .select('username, role')
            .eq('id', targetId)
            .single();

        if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

        // system_manager cannot delete another system_manager
        if (target.role === 'system_manager') {
            return res.status(403).json({ error: 'Başka bir sistem yöneticisi silinemez.' });
        }

        const { error } = await supabase.from('users').delete().eq('id', targetId);
        if (error) throw error;

        await supabase.from('activity_logs').insert({
            user_id: req.user.id,
            action: 'USER_DELETE',
            details: `${req.user.username} kullanıcı '${target.username}' (#${targetId}) sildi.`,
            ip_address: req.ip
        });

        res.json({ message: `'${target.username}' hesabı silindi.` });
    } catch (error) {
        res.status(500).json({ error: 'Kullanıcı silinemedi.', details: error.message });
    }
};
