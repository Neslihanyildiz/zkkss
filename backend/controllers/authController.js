const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { username, password, publicKey } = req.body;

        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (existing) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const { data: newUser, error } = await supabase
            .from('users')
            .insert({ username, password_hash, public_key: publicKey })
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
            .select('id, username, password_hash, public_key')
            .eq('username', username)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Hatalı şifre.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
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
            user: { id: user.id, username: user.username, public_key: user.public_key }
        });
    } catch (error) {
        res.status(500).json({ error: 'Giriş sırasında hata oluştu.' });
    }
};
