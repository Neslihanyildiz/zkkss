// src/components/FileUpload.jsx
import { useState } from 'react';
import { api } from '../services/api';
import { generateAESKey, encryptFile } from '../utils/aes';
import { importKey, wrapAESKey } from '../utils/rsa';

export default function FileUpload({ user, onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async () => {
        if (!file) return;
        
        setStatus('🔐 Şifreleme işlemi başladı...');
        setIsUploading(true); // Butonu devre dışı bırak

        try {
            // 1. Kullanıcının Public Key'ini al (LocalStorage'dan)
            const pubKeyStr = localStorage.getItem(`pub_${user.username}`);
            if (!pubKeyStr) throw new Error("Şifreleme anahtarı bulunamadı! Lütfen tekrar giriş yapın.");
            const publicKey = await importKey(pubKeyStr, "public");

            // 2. Dosyayı ArrayBuffer olarak oku
            const fileBuffer = await file.arrayBuffer();

            // 3. Tek seferlik AES anahtarı üret
            const aesKey = await generateAESKey();

            // 4. Dosyayı AES ile şifrele (SADECE İÇERİK)
            // Not: Artık dosyanın başına anahtar veya header EKLEMİYORUZ.
            const encryptedFileContent = await encryptFile(fileBuffer, aesKey);

            // 5. AES anahtarını RSA ile şifrele (Key Wrapping)
            const wrappedKey = await wrapAESKey(aesKey, publicKey);

            // --- DEĞİŞİKLİK BURADA BAŞLIYOR ---

            // 6. Anahtarı Transfer Formatına Çevir (JSON String)
            // Eski kodundaki "DataView" ve "Paketleme" kısımlarını kaldırdık.
            // Anahtarı ayrı bir metin olarak göndereceğiz.
            const wrappedKeyArray = Array.from(new Uint8Array(wrappedKey));
            const wrappedKeyJSON = JSON.stringify(wrappedKeyArray);

            // 7. Backend'e Gönderilecek Formu Hazırla
            const formData = new FormData();
            
            // A. Şifreli Dosya (Saf Veri)
            const blob = new Blob([encryptedFileContent]);
            formData.append('file', blob, file.name + ".enc");
            
            // B. Kullanıcı ID
            formData.append('userId', user.id);
            
            // C. Şifreli Anahtar (AYRI ALAN - Yeni Mimarinin Kalbi)
            // Server.js'deki "req.body.encryptedKey" burayı bekliyor.
            formData.append('encryptedKey', wrappedKeyJSON);

            setStatus('📤 Sunucuya yükleniyor...');
            
            // 8. Gönder
            await api.uploadFile(formData);
            
            setStatus('✅ Başarılı! Dosya ve Anahtar güvenle ayrıştırılarak saklandı.');
            setFile(null);
            
            if (onUploadSuccess) onUploadSuccess(); // Listeyi yenile

        } catch (err) {
            console.error("Yükleme Hatası:", err);
            setStatus('❌ Hata: ' + err.message);
        } finally {
            setIsUploading(false); // İşlem bitince butonu aç
        }
    };

    return (
        <div className="upload-section">
            <h3>Güvenli Dosya Yükle (Zero-Knowledge)</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                    type="file" 
                    onChange={e => setFile(e.target.files[0])} 
                    disabled={isUploading}
                />
                <button 
                    onClick={handleUpload} 
                    disabled={!file || isUploading}
                >
                    {isUploading ? 'İşleniyor...' : 'Şifrele ve Yükle 🔒'}
                </button>
            </div>
            <p style={{ marginTop: '10px', color: status.includes('Hata') ? 'red' : 'green' }}>
                {status}
            </p>
        </div>
    );
}