const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { validatePassword } = require('../utils/passwordValidator');

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { username, password, publicKey, encryptedPrivateKey, keySalt } = req.body;

        // Password strength check
        const errors = validatePassword(password);
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Şifre güvenlik gereksinimlerini karşılamıyor.',
                requirements: errors
            });
        }

        // Duplicate username check
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (existing) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
        }

        const password_hash = await bcrypt.hash(password, 12);

        // Try inserting with key-wrapping fields first.
        // If the columns don't exist yet in Supabase, fall back to basic insert.
        let newUser, insertError;
        ({ data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
                username,
                password_hash,
                public_key:             publicKey,
                encrypted_private_key:  encryptedPrivateKey ?? null,
                key_salt:               keySalt ?? null,
            })
            .select('id, username')
            .single());

        if (insertError) {
            if (insertError.message.includes('encrypted_private_key') || insertError.message.includes('key_salt')) {
                // Columns not added to Supabase yet — insert without them
                ({ data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert({ username, password_hash, public_key: publicKey })
                    .select('id, username')
                    .single());
            }
            if (insertError) throw insertError;
        }

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

        // Select * so we get 'role' if the column exists, without erroring if it doesn't
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Hatalı şifre.' });
        }

        // Default to 'user' if role column doesn't exist yet
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
            message:               'Giriş başarılı.',
            token,
            // Return the PBKDF2-wrapped private key so the browser can unlock it
            // on any device using the user's password (never stored in plaintext)
            encrypted_private_key: user.encrypted_private_key ?? null,
            key_salt:              user.key_salt ?? null,
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
