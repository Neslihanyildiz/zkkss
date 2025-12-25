const API_URL = 'http://localhost:3000/api';

export const api = {
    // Register artık Public Key de alıyor
    register: async (username, password, publicKey) => {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, publicKey })
        });
        return res.json();
    },

    login: async (username, password) => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error('Giriş başarısız');
        return res.json();
    },

    uploadFile: async (formData) => {
        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData 
        });
        return res.json();
    },

    getFiles: async (userId) => {
        const res = await fetch(`${API_URL}/files/${userId}`);
        return res.json();
    },

    downloadFile: async (fileId) => {
        const res = await fetch(`${API_URL}/download/${fileId}`);
        if (!res.ok) throw new Error('İndirme hatası');
        return res.blob();
    },

    getLogs: async () => {
        const res = await fetch(`${API_URL}/logs`);
        return res.json();
    },

    // --- YENİ EKLENEN PAYLAŞIM FONKSİYONLARI ---
    
    getUsersList: async (myId) => {
        const res = await fetch(`${API_URL}/users-list/${myId}`);
        return res.json();
    },

    shareFile: async (fileId, fromUserId, toUserId, encryptedKey) => {
        const res = await fetch(`${API_URL}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId, fromUserId, toUserId, encryptedKey })
        });
        return res.json();
    },

    getSharedFiles: async (userId) => {
        const res = await fetch(`${API_URL}/shared-files/${userId}`);
        return res.json();
    }
};