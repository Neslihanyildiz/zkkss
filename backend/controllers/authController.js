const User = require('../models/User');
const AuditLog = require('../models/AuditLog'); // Log modelini çağırdık
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- KULLANICI KAYIT (REGISTER) ---
exports.register = async (req, res) => {
    try {
        const { username, password, publicKey } = req.body;

        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username,
            password_hash: hashedPassword,
            public_key: publicKey
        });

        // LOGLAMA: Kayıt olma işlemi
        await AuditLog.create({
            user_id: newUser.id,
            action: 'REGISTER',
            details: `${username} kullanıcısı sisteme kayıt oldu.`,
            ip_address: req.ip
        });

        res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.', userId: newUser.id });

    } catch (error) {
        res.status(500).json({ error: 'Kayıt sırasında hata oluştu.', details: error.message });
    }
};

// --- GİRİŞ YAPMA (LOGIN) ---
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Hatalı şifre.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // LOGLAMA: Giriş işlemi
        await AuditLog.create({
            user_id: user.id,
            action: 'LOGIN',
            details: `${username} sisteme giriş yaptı.`,
            ip_address: req.ip
        });

        res.json({
            message: 'Giriş başarılı.',
            token,
            publicKey: user.public_key
        });

    } catch (error) {
        res.status(500).json({ error: 'Giriş sırasında hata oluştu.' });
    }
};