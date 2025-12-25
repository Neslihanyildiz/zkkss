import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import FileUpload from './FileUpload';
import { importKey, unwrapAESKey, wrapAESKey } from '../utils/rsa';
import { decryptFile } from '../utils/aes';

export default function Dashboard({ user, onLogout }) {
    const [files, setFiles] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]); // Bana paylaşılanlar
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]); // Paylaşabileceğim kişiler
    const [selectedUser, setSelectedUser] = useState('');
    const [shareFileId, setShareFileId] = useState(null); // Hangi dosyayı paylaşıyoruz?

    // --- VERİ YÜKLEME FONKSİYONU (GÜNCELLENDİ: useCallback) ---
    // useCallback sayesinde bu fonksiyon hafızada sabitlenir ve gereksiz render'ı önler.
    const loadData = useCallback(async () => {
        try {
            const fileList = await api.getFiles(user.id);
            setFiles(fileList);
            
            const sharedList = await api.getSharedFiles(user.id);
            setSharedFiles(sharedList);

            const logList = await api.getLogs();
            setLogs(logList);

            const userList = await api.getUsersList(user.id);
            setUsers(userList);
        } catch (error) {
            console.error("Veri yükleme hatası:", error);
        }
    }, [user.id]); // Sadece user.id değişirse fonksiyon yenilenir.

    useEffect(() => {
        // eslint-disable-next-line
        loadData(); // İlk açılışta verileri çek
        
        // Logları canlı tutmak için interval
        const interval = setInterval(() => api.getLogs().then(setLogs), 2000);
        
        // Temizlik (Cleanup)
        return () => clearInterval(interval);
    }, [loadData]); // loadData artık güvenli bir bağımlılık

    // --- DOSYA PAYLAŞMA MANTIĞI (CRYPTO CORE) ---
    const handleShare = async () => {
        if (!selectedUser || !shareFileId) return;
        
        try {
            alert("Paylaşım işlemi başlıyor. Tarayıcınızda şifreleme yapılacak...");

            // 1. Önce dosyayı indirip KENDİ anahtarımızla AES anahtarını çözmemiz lazım
            const blob = await api.downloadFile(shareFileId);
            const buffer = await blob.arrayBuffer();

            // Kendi Private Key'imiz
            const privKeyStr = localStorage.getItem(`priv_${user.username}`);
            const privateKey = await importKey(privKeyStr, "private");

            // Dosya başlığından şifreli AES anahtarını al
            const view = new DataView(buffer);
            const keyLength = view.getUint32(0, true);
            const wrappedKey = buffer.slice(4, 4 + keyLength);

            // AES anahtarını açığa çıkar (Unwrap)
            const aesKey = await unwrapAESKey(wrappedKey, privateKey);

            // 2. Şimdi bu AES anahtarını, ALICI KİŞİNİN Public Key'i ile şifrele (Wrap)
            const targetUser = users.find(u => u.id == selectedUser);
            const targetPubKey = await importKey(targetUser.public_key, "public");
            
            const reWrappedKey = await wrapAESKey(aesKey, targetPubKey);

            // 3. Yeni şifreli anahtarı sunucuya gönder
            // ArrayBuffer -> String dönüşümü için JSON stringify:
            const reWrappedKeyArray = Array.from(new Uint8Array(reWrappedKey));
            
            await api.shareFile(shareFileId, user.id, selectedUser, JSON.stringify(reWrappedKeyArray));

            alert(`Dosya ${targetUser.username} ile başarıyla paylaşıldı!`);
            setShareFileId(null);
            loadData(); // Listeleri güncelle

        } catch (err) {
            console.error(err);
            alert("Paylaşım hatası: " + err.message);
        }
    };

    // --- İNDİRME MANTIĞI ---
    const handleDownload = async (fileId, fileName, isShared = false, sharedKeyJson = null) => {
        try {
            const blob = await api.downloadFile(fileId);
            const buffer = await blob.arrayBuffer();

            const privKeyStr = localStorage.getItem(`priv_${user.username}`);
            const privateKey = await importKey(privKeyStr, "private");

            let aesKey;

            if (isShared) {
                // EĞER PAYLAŞILAN DOSYA İSE:
                const sharedKeyArray = JSON.parse(sharedKeyJson);
                const sharedKeyBuffer = new Uint8Array(sharedKeyArray).buffer;
                
                // Bana özel şifrelenmiş anahtarı çöz
                aesKey = await unwrapAESKey(sharedKeyBuffer, privateKey);

            } else {
                // KENDİ DOSYAM İSE:
                const view = new DataView(buffer);
                const keyLength = view.getUint32(0, true);
                const wrappedKey = buffer.slice(4, 4 + keyLength);
                aesKey = await unwrapAESKey(wrappedKey, privateKey);
            }

            // Dosyanın içeriğini (Header'ı atlayarak) çöz
            // Header uzunluğunu hesapla
            const view = new DataView(buffer);
            const originalKeyLength = view.getUint32(0, true);
            const offset = 4 + originalKeyLength;
            
            const encryptedContent = buffer.slice(offset);

            // Çözme işlemi
            const decryptedBuffer = await decryptFile(new Uint8Array(encryptedContent), aesKey);

            const url = window.URL.createObjectURL(new Blob([decryptedBuffer]));
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName.replace('.enc', '');
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert("Hata: " + err.message);
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
                    
                    {/* PAYLAŞIM MODALI */}
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
                    {/* BÖLÜM 1: DOSYALARIM */}
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
                                        <button className="icon-btn" onClick={() => handleDownload(f.id, f.filename, false)}>⬇️</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* BÖLÜM 2: BANA PAYLAŞILANLAR */}
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
                                        <button className="icon-btn" onClick={() => handleDownload(f.id, f.filename, true, f.encrypted_key)}>
                                            ⬇️ İndir
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* BÖLÜM 3: LOGLAR */}
                    <div className="panel-card logs-card" style={{marginTop:'20px'}}>
                        <h3>📟 Audit Logs</h3>
                        <div className="terminal-window">
                            {logs.map((log) => (
                                <div key={log.id} className="log-line">
                                    <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span className={`log-action ${log.action}`}>{log.action}</span>
                                    <span className="log-detail"> | {log.username || 'System'}: {log.details}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}