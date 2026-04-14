const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { validatePassword } = require('../utils/passwordValidator');

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { username, password, publicKey } = req.body;

        // ── Password strength check ──────────────────────────────────────
        const errors = validatePassword(password);
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Şifre güvenlik gereksinimlerini karşılamıyor.',
                requirements: errors
            });
        }

        // ── Duplicate username check ─────────────────────────────────────
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (existing) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
        }

        const password_hash = await bcrypt.hash(password, 12); // cost 12 for stronger hashing

        const { data: newUser, error } = await supabase
            .from('users')
            .insert({ username, password_hash, public_key: publicKey, role: 'user' })
            .select('id, username')
            .single();

        if (error) throw error;

        await supabase.from('activity_logs').insert({
            user_id: newUser.id,
            action: 'REGISTER',
            details: `${username} sisteme kayıt oldu.`,
            ip_address: req.ip
        });

        res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.', userId: newUser.id });
    } catch (error) {
        res.status(500).json({ error: 'Kayıt sırasında hata oluştu.', details: error.message });
    }
};

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, password_hash, public_key, role')
            .eq('username', username)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Hatalı şifre.' });
        }

        // Role defaults to 'user' if the column doesn't exist yet in Supabase
        const role = user.role ?? 'user';

        const token = jwt.sign(
            { id: user.id, username: user.username, role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'LOGIN',
            details: `${username} sisteme giriş yaptı.`,
            ip_address: req.ip
        });

        // NEVER include password_hash in the response
        res.json({
            message: 'Giriş başarılı.',
            token,
            user: {
                id:         user.id,
                username:   user.username,
                public_key: user.public_key,
                role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Giriş sırasında hata oluştu.' });
    }
};
