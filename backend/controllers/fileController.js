const supabase = require('../config/supabase');

// POST /api/files/upload  (protected)
exports.uploadFile = async (req, res) => {
    try {
        const { encryptedKey, originalFilename } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'Dosya yüklenmedi.' });
        if (!encryptedKey) return res.status(400).json({ error: 'Şifreleme anahtarı eksik.' });

        const storagePath = `${req.user.id}/${Date.now()}.enc`;

        const { error: uploadError } = await supabase.storage
            .from('encrypted-files')
            .upload(storagePath, file.buffer, { contentType: 'application/octet-stream' });

        if (uploadError) throw uploadError;

        const { data: newFile, error: dbError } = await supabase
            .from('files')
            .insert({ user_id: req.user.id, filename: originalFilename || file.originalname.replace(/\.enc$/, ''), storage_path: storagePath })
            .select('id')
            .single();

        if (dbError) throw dbError;

        // Store the owner's encrypted key so they can decrypt their own file later
        const { error: shareError } = await supabase.from('file_shares').insert({
            file_id: newFile.id,
            from_user_id: req.user.id,
            to_user_id: req.user.id,
            encrypted_key: encryptedKey
        });

        if (shareError) throw shareError;

        await supabase.from('activity_logs').insert({
            user_id: req.user.id,
            action: 'UPLOAD',
            details: `${req.user.username} dosya yükledi: ${file.originalname}`,
            ip_address: req.ip
        });

        res.status(201).json({ message: 'Dosya yüklendi.', fileId: newFile.id });
    } catch (error) {
        console.error('Upload hatası:', error);
        res.status(500).json({ error: 'Yükleme hatası.', details: error.message });
    }
};

// GET /api/files/list  (protected — userId from JWT)
exports.getMyFiles = async (req, res) => {
    try {
        // 1. Get files owned by this user
        const { data: files, error } = await supabase
            .from('files')
            .select('id, filename, upload_date')
            .eq('user_id', req.user.id);

        if (error) throw error;
        if (!files.length) return res.json([]);

        // 2. Get the owner's share record for each file (to_user_id = owner)
        const fileIds = files.map(f => f.id);
        const { data: shares, error: sharesError } = await supabase
            .from('file_shares')
            .select('file_id, encrypted_key')
            .in('file_id', fileIds)
            .eq('to_user_id', req.user.id);

        if (sharesError) throw sharesError;

        const sharesMap = Object.fromEntries((shares || []).map(s => [s.file_id, s]));

        const result = files.map(f => ({
            id:            f.id,
            filename:      f.filename,
            upload_date:   f.upload_date,
            encrypted_key: sharesMap[f.id]?.encrypted_key ?? null
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Dosyalar getirilemedi.' });
    }
};

// GET /api/files/download/:fileId  (protected + IDOR check via file_shares)
exports.downloadFile = async (req, res) => {
    try {
        const { fileId } = req.params;

        const { data: file, error } = await supabase
            .from('files')
            .select('id, filename, storage_path, user_id')
            .eq('id', fileId)
            .single();

        if (error || !file) return res.status(404).json({ error: 'Dosya bulunamadı.' });

        // IDOR check: user must own the file OR have a share record
        const { data: share } = await supabase
            .from('file_shares')
            .select('id')
            .eq('file_id', fileId)
            .eq('to_user_id', req.user.id)
            .single();

        if (!share) return res.status(403).json({ error: 'Bu dosyaya erişim yetkiniz yok.' });

        const { data: signedUrl, error: urlError } = await supabase.storage
            .from('encrypted-files')
            .createSignedUrl(file.storage_path, 60); // 60-second expiry

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

// POST /api/files/share  (protected — fromUserId always from JWT)
exports.shareFile = async (req, res) => {
    try {
        const { fileId, toUserId, encryptedKey } = req.body;
        const fromUserId = req.user.id; // never trust fromUserId from body

        // Verify the sharer owns the file
        const { data: file } = await supabase
            .from('files')
            .select('id')
            .eq('id', fileId)
            .eq('user_id', fromUserId)
            .single();

        if (!file) return res.status(403).json({ error: 'Bu dosyayı paylaşma yetkiniz yok.' });

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

// GET /api/files/shared  (protected — files shared WITH current user)
exports.getSharedFiles = async (req, res) => {
    try {
        // 1. Get share records where I am the recipient (exclude my own uploads)
        const { data: shares, error } = await supabase
            .from('file_shares')
            .select('file_id, encrypted_key, from_user_id')
            .eq('to_user_id', req.user.id)
            .neq('from_user_id', req.user.id);

        if (error) throw error;
        if (!shares.length) return res.json([]);

        // 2. Fetch file metadata for those file IDs
        const fileIds = shares.map(s => s.file_id);
        const { data: files, error: filesError } = await supabase
            .from('files')
            .select('id, filename, upload_date')
            .in('id', fileIds);

        if (filesError) throw filesError;

        // 3. Fetch sender usernames
        const senderIds = [...new Set(shares.map(s => s.from_user_id))];
        const { data: senders, error: sendersError } = await supabase
            .from('users')
            .select('id, username')
            .in('id', senderIds);

        if (sendersError) throw sendersError;

        const filesMap  = Object.fromEntries((files   || []).map(f => [f.id,  f]));
        const senderMap = Object.fromEntries((senders || []).map(u => [u.id, u.username]));

        const result = shares.map(s => ({
            id:            filesMap[s.file_id]?.id,
            filename:      filesMap[s.file_id]?.filename,
            upload_date:   filesMap[s.file_id]?.upload_date,
            sender_name:   senderMap[s.from_user_id],
            encrypted_key: s.encrypted_key
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Paylaşılan dosyalar getirilemedi.' });
    }
};

// GET /api/files/users  (protected — all users except current)
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

// GET /api/files/logs  (protected)
exports.getLogs = async (req, res) => {
    try {
        const { data: logs, error } = await supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Resolve usernames separately to avoid join dependency on FK constraints
        const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
        const { data: users } = await supabase
            .from('users')
            .select('id, username')
            .in('id', userIds);

        const userMap = Object.fromEntries((users || []).map(u => [u.id, u.username]));

        res.json(logs.map(log => ({
            id:        log.id,
            user_id:   log.user_id,
            username:  userMap[log.user_id] ?? 'Unknown',
            action:    log.action,
            details:   log.details,
            timestamp: log.created_at
        })));
    } catch (error) {
        res.status(500).json({ error: 'Loglar getirilemedi.' });
    }
};
