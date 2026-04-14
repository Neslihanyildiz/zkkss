const API_URL = 'http://localhost:3000/api';

const getToken = () => localStorage.getItem('token');

export const api = {

    // --- AUTH ---
    register: async (username, password, publicKey) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, publicKey })
        });
        return res.json();
    },

    login: async (username, password) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return res.json();
    },

    // --- DOSYALAR ---
    uploadFile: async (formData) => {
        const res = await fetch(`${API_URL}/files/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
            body: formData
        });
        return res.json();
    },

    getMyFiles: async () => {
        const res = await fetch(`${API_URL}/files/list`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        return res.json();
    },

    downloadFile: async (fileId) => {
        const res = await fetch(`${API_URL}/files/download/${fileId}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        return res.json(); // artık { url, filename } dönüyor
    },

    shareFile: async (fileId, toUserId, encryptedKey) => {
        const res = await fetch(`${API_URL}/files/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken()}`
            },
            body: JSON.stringify({ fileId, toUserId, encryptedKey })
        });
        return res.json();
    },

    getSharedFiles: async () => {
        const res = await fetch(`${API_URL}/files/shared`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        return res.json();
    },

    getUsers: async () => {
        const res = await fetch(`${API_URL}/files/users`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        return res.json();
    },

    getLogs: async () => {
        const res = await fetch(`${API_URL}/files/logs`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        return res.json();
    }
};