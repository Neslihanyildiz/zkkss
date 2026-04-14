const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { username, password, publicKey } = req.body;

        const existing = await User.findOne({ where: { username } });
        if (existing) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username,
            password: hashedPassword,   // column is 'password' in project.db
            public_key: publicKey
        });

        await AuditLog.create({
            user_id: newUser.id,
            action: 'REGISTER',
            details: `${username} kullanıcısı sisteme kayıt oldu.`
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

        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Hatalı şifre.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        await AuditLog.create({
            user_id: user.id,
            action: 'LOGIN',
            details: `${username} sisteme giriş yaptı.`
        });

        // NEVER include password / password_hash in the response
        res.json({
            message: 'Giriş başarılı.',
            token,
            user: {
                id: user.id,
                username: user.username,
                public_key: user.public_key
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Giriş sırasında hata oluştu.' });
    }
};
