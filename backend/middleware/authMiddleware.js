const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // 1. Token'ı başlık (header) kısmından al: "Bearer <token>"
        const token = req.headers.authorization.split(' ')[1];
        
        // 2. Token'ı doğrula
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Çözülen kullanıcı bilgisini isteğe ekle (req.user artık kullanılabilir)
        req.user = decoded;
        
        next(); // Her şey yolunda, sıradaki işleme geç
    } catch (error) {
        return res.status(401).json({ error: 'Yetkilendirme başarısız. Lütfen giriş yapın.' });
    }
};