import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import FileUpload from './FileUpload';
import { importKey, unwrapAESKey, wrapAESKey } from '../utils/rsa';
import { decryptFile } from '../utils/aes';

export default function Dashboard({ user, onLogout }) {
    const [files, setFiles] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]);
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [shareFileId, setShareFileId] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const fileList = await api.getMyFiles();
            setFiles(Array.isArray(fileList) ? fileList : []);

            const sharedList = await api.getSharedFiles();
            setSharedFiles(Array.isArray(sharedList) ? sharedList : []);

            const logList = await api.getLogs();
            setLogs(Array.isArray(logList) ? logList : []);

            const userList = await api.getUsers();
            setUsers(Array.isArray(userList) ? userList : []);
        } catch (error) {
            console.error("Veri yükleme hatası:", error);
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(() => {
            api.getLogs().then(data => setLogs(Array.isArray(data) ? data : []));
        }, 5000);
        return () => clearInterval(interval);
    }, [loadData]);

    const handleShare = async () => {
        if (!selectedUser || !shareFileId) return;

        try {
            alert("Paylaşım işlemi başlıyor. Anahtar şifreleniyor...");

            const fileToShare = files.find(f => f.id === shareFileId);
            if (!fileToShare || !fileToShare.encrypted_key) {
                throw new Error("Dosya anahtarı bulunamadı!");
            }

            const privKeyStr = localStorage.getItem(`priv_${user.username}`);
            const privateKey = await importKey(privKeyStr, "private");

            const myKeyArray = JSON.parse(fileToShare.encrypted_key);
            const myKeyBuffer = new Uint8Array(myKeyArray).buffer;
            const aesKey = await unwrapAESKey(myKeyBuffer, privateKey);

            const targetUser = users.find(u => u.id == selectedUser);
            const targetPubKey = await importKey(targetUser.public_key, "public");
            const reWrappedKey = await wrapAESKey(aesKey, targetPubKey);

            const reWrappedKeyArray = Array.from(new Uint8Array(reWrappedKey));
            await api.shareFile(shareFileId, selectedUser, JSON.stringify(reWrappedKeyArray));

            alert(`Dosya ${targetUser.username} ile başarıyla paylaşıldı!`);
            setShareFileId(null);
            loadData();

        } catch (err) {
            console.error(err);
            alert("Paylaşım hatası: " + err.message);
        }
    };

    const handleDownload = async (fileId, fileName, encryptedKeyJSON) => {
        try {
            if (!encryptedKeyJSON) {
                alert("Hata: Anahtar bulunamadı. Lütfen sayfayı yenileyin.");
                return;
            }

            // 1. Backend'den signed URL al
            const { url, filename } = await api.downloadFile(fileId);
            if (!url) throw new Error("İndirme URL'i alınamadı.");

            // 2. Şifreli dosyayı signed URL'den indir
            const response = await fetch(url);
            const encryptedFileBuffer = await response.arrayBuffer();

            // 3. Private Key'i al
            const privKeyStr = localStorage.getItem(`priv_${user.username}`);
            const privateKey = await importKey(privKeyStr, "private");

            // 4. AES anahtarını çöz
            const keyArray = JSON.parse(encryptedKeyJSON);
            const keyBuffer = new Uint8Array(keyArray).buffer;
            const aesKey = await unwrapAESKey(keyBuffer, privateKey);

            // 5. Dosyayı çöz
            const decryptedBuffer = await decryptFile(new Uint8Array(encryptedFileBuffer), aesKey);

            // 6. İndir
            const dlUrl = window.URL.createObjectURL(new Blob([decryptedBuffer]));
            const a = document.createElement('a');
            a.href = dlUrl;
            a.download = (filename || fileName).replace('.enc', '');
            a.click();
            window.URL.revokeObjectURL(dlUrl);

        } catch (err) {
            console.error(err);
            alert("İndirme Hatası: " + err.message);
        }
    };

    return (
        <div className="dashboard-container">
            <header className="top-bar">
                <div className="logo-area"><h2>🛡️ ZK-SecureStorage</h2></div>
                <div className="user-area">
                    <span>{user.username}</span>
                    <button onClick={onLogout} className="logout-btn-text">Çıkış</button>
                </div>
            </header>

            <div className="main-grid">
                <div className="left-panel">
                    <FileUpload user={user} onUploadSuccess={loadData} />

                    {shareFileId && (
                        <div className="panel-card share-card" style={{border: '2px solid #2563eb'}}>
                            <h4>Dosya Paylaş</h4>
                            <p>Dosya ID: #{shareFileId}</p>
                            <select onChange={(e) => setSelectedUser(e.target.value)} value={selectedUser}>
                                <option value="">Kişi Seçin...</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                            </select>
                            <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                                <button onClick={handleShare}>Gönder 🚀</button>
                                <button onClick={() => setShareFileId(null)} style={{background:'#ef4444'}}>İptal</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="right-panel">
                    <div className="panel-card files-card">
                        <h3>📂 Dosyalarım</h3>
                        <ul className="file-list-modern">
                            {files.map(f => (
                                <li key={f.id}>
                                    <div className="file-info">
                                        <span className="fname">{f.filename}</span>
                                        <span className="badge">🔒 Sahibi: Ben</span>
                                    </div>
                                    <div className="actions">
                                        <button className="icon-btn" onClick={() => setShareFileId(f.id)} title="Paylaş">🔗</button>
                                        <button className="icon-btn" onClick={() => handleDownload(f.id, f.filename, f.encrypted_key)}>⬇️</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="panel-card files-card" style={{marginTop:'20px', borderLeft:'4px solid #f59e0b'}}>
                        <h3>📨 Bana Paylaşılanlar</h3>
                        {sharedFiles.length === 0 ? <p className="empty-msg">Size gönderilen dosya yok.</p> : (
                            <ul className="file-list-modern">
                                {sharedFiles.map(f => (
                                    <li key={f.id}>
                                        <div className="file-info">
                                            <span className="fname">{f.filename}</span>
                                            <span className="fdate">Gönderen: {f.sender_name}</span>
                                            <span className="badge" style={{background:'#fffbeb', color:'#b45309'}}>🔑 Paylaşımlı</span>
                                        </div>
                                        <button className="icon-btn" onClick={() => handleDownload(f.id, f.filename, f.encrypted_key)}>
                                            ⬇️ İndir
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="panel-card logs-card" style={{marginTop:'20px'}}>
                        <h3>📟 Audit Logs</h3>
                        <div className="terminal-window">
                            {logs.map((log) => (
                                <div key={log.id} className="log-line">
                                    <span className="log-time">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                                    <span className={`log-action ${log.action}`}>{log.action}</span>
                                    <span className="log-detail"> | {log.users?.username || 'System'}: {log.details}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}