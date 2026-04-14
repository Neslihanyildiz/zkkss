const supabase = require('../config/supabase');

// --- DOSYA YÜKLEME ---
exports.uploadFile = async (req, res) => {
    try {
        console.log('Upload başladı');
        console.log('req.file:', req.file);
        console.log('req.body:', req.body);
        console.log('req.user:', req.user);
        
        const { encryptedKey } = req.body;
        const file = req.file;
        // ... geri kalan kod aynı kalıyor

        if (!file) return res.status(400).json({ error: 'Dosya yüklenmedi.' });
        if (!encryptedKey) return res.status(400).json({ error: 'Şifreleme anahtarı eksik.' });

        const storagePath = `${req.user.id}/${Date.now()}_${file.originalname}`;

        const { error: uploadError } = await supabase.storage
            .from('encrypted-files')
            .upload(storagePath, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw uploadError;

        const { data: newFile, error: dbError } = await supabase
            .from('files')
            .insert({
                user_id: req.user.id,
                filename: file.originalname,
                storage_path: storagePath
            })
            .select('id')
            .single();

        if (dbError) throw dbError;

        await supabase.from('file_shares').insert({
            file_id: newFile.id,
            from_user_id: req.user.id,
            to_user_id: req.user.id,
            encrypted_key: encryptedKey
        });

        await supabase.from('activity_logs').insert({
            user_id: req.user.id,
            action: 'UPLOAD',
            details: `${req.user.username} dosya yükledi: ${file.originalname}`,
            ip_address: req.ip
        });

        res.status(201).json({ message: 'Dosya yüklendi.', fileId: newFile.id });

    } catch (error) {
        console.error('Upload hatası:', error); // ← bunu ekle
        res.status(500).json({ error: 'Yükleme hatası.', details: error.message });
    }
};

// --- DOSYALARIMI LİSTELE ---
exports.getMyFiles = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('files')
            .select('id, filename, upload_date, file_shares(encrypted_key)')
            .eq('user_id', req.user.id)
            .eq('file_shares.to_user_id', req.user.id);

        if (error) throw error;

        const files = data.map(f => ({
            id: f.id,
            filename: f.filename,
            upload_date: f.upload_date,
            encrypted_key: f.file_shares?.[0]?.encrypted_key
        }));

        res.json(files);

    } catch (error) {
        res.status(500).json({ error: 'Dosyalar getirilemedi.' });
    }
};

// --- DOSYA İNDİR ---
exports.downloadFile = async (req, res) => {
    try {
        const { fileId } = req.params;

        const { data: file, error } = await supabase
            .from('files')
            .select('id, filename, storage_path, user_id')
            .eq('id', fileId)
            .single();

        if (error || !file) return res.status(404).json({ error: 'Dosya bulunamadı.' });

        // Erişim kontrolü: sahip mi yoksa paylaşılan mı?
        const { data: share } = await supabase
            .from('file_shares')
            .select('id')
            .eq('file_id', fileId)
            .eq('to_user_id', req.user.id)
            .single();

        if (!share) return res.status(403).json({ error: 'Bu dosyaya erişim yetkiniz yok.' });

        const { data: signedUrl, error: urlError } = await supabase.storage
            .from('encrypted-files')
            .createSignedUrl(file.storage_path, 60);

        if (urlError) throw urlError;

        await supabase.from('activity_logs').insert({
            user_id: req.user.id,
            action: 'DOWNLOAD',
            details: `${req.user.username} dosya indirdi: ${file.filename}`,
            ip_address: req.ip
        });

        res.json({ url: signedUrl.signedUrl, filename: file.filename });

    } catch (error) {
        res.status(500).json({ error: 'İndirme hatası.', details: error.message });
    }
};

// --- DOSYA PAYLAŞ ---
exports.shareFile = async (req, res) => {
    try {
        const { fileId, toUserId, encryptedKey } = req.body;
        const fromUserId = req.user.id; // token'dan al, body'den değil

        // Zaten paylaşılmış mı?
        const { data: existing } = await supabase
            .from('file_shares')
            .select('id')
            .eq('file_id', fileId)
            .eq('to_user_id', toUserId)
            .single();

        if (existing) return res.status(400).json({ error: 'Bu dosya zaten paylaşılmış.' });

        const { error } = await supabase.from('file_shares').insert({
            file_id: fileId,
            from_user_id: fromUserId,
            to_user_id: toUserId,
            encrypted_key: encryptedKey
        });

        if (error) throw error;

        await supabase.from('activity_logs').insert({
            user_id: fromUserId,
            action: 'SHARE',
            details: `Dosya paylaşıldı (fileId: ${fileId} → userId: ${toUserId})`,
            ip_address: req.ip
        });

        res.json({ message: 'Dosya paylaşıldı.' });

    } catch (error) {
        res.status(500).json({ error: 'Paylaşım hatası.', details: error.message });
    }
};

// --- BANA PAYLAŞILAN DOSYALAR ---
exports.getSharedFiles = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('file_shares')
            .select('encrypted_key, files(id, filename, upload_date), from_user:users!from_user_id(username)')
            .eq('to_user_id', req.user.id)
            .neq('from_user_id', req.user.id); // kendi yüklediklerini gösterme

        if (error) throw error;

        const files = data.map(s => ({
            id: s.files?.id,
            filename: s.files?.filename,
            upload_date: s.files?.upload_date,
            sender_name: s.from_user?.username,
            encrypted_key: s.encrypted_key
        }));

        res.json(files);

    } catch (error) {
        res.status(500).json({ error: 'Paylaşılan dosyalar getirilemedi.' });
    }
};

// --- KULLANICI LİSTESİ ---
exports.getUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, public_key')
            .neq('id', req.user.id);

        if (error) throw error;

        res.json(data);

    } catch (error) {
        res.status(500).json({ error: 'Kullanıcılar getirilemedi.' });
    }
};

// --- LOGLAR ---
exports.getLogs = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*, users(username)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data);

    } catch (error) {
        res.status(500).json({ error: 'Loglar getirilemedi.' });
    }
};