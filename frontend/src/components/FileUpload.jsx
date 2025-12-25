// src/components/FileUpload.jsx
import { useState } from 'react';
import { api } from '../services/api';
import { generateAESKey, encryptFile } from '../utils/aes';
import { importKey, wrapAESKey } from '../utils/rsa';

export default function FileUpload({ user, onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('');

    const handleUpload = async () => {
        if (!file) return;
        setStatus('Şifreleniyor ve yükleniyor...');

        try {
            // 1. Kullanıcının Public Key'ini al
            const pubKeyStr = localStorage.getItem(`pub_${user.username}`);
            if (!pubKeyStr) throw new Error("Şifreleme anahtarı bulunamadı!");
            const publicKey = await importKey(pubKeyStr, "public");

            // 2. Dosyayı ArrayBuffer olarak oku
            const fileBuffer = await file.arrayBuffer();

            // 3. Tek seferlik AES anahtarı üret
            const aesKey = await generateAESKey();

            // 4. Dosyayı AES ile şifrele
            const encryptedFileContent = await encryptFile(fileBuffer, aesKey);

            // 5. AES anahtarını RSA ile şifrele (Key Wrapping)
            const wrappedKey = await wrapAESKey(aesKey, publicKey);

            // 6. Paketleme: [Wrapped Key Length (4 byte)] + [Wrapped Key] + [Encrypted Content]
            // Bu yöntemle sunucudan geri alırken anahtarı ayırabiliriz.
            const keyLength = wrappedKey.byteLength;
            const totalLength = 4 + keyLength + encryptedFileContent.byteLength;
            const finalBuffer = new Uint8Array(totalLength);

            const view = new DataView(finalBuffer.buffer);
            view.setUint32(0, keyLength, true); // İlk 4 byte anahtar uzunluğu

            finalBuffer.set(new Uint8Array(wrappedKey), 4);
            finalBuffer.set(encryptedFileContent, 4 + keyLength);

            // 7. Backend'e Gönder
            const blob = new Blob([finalBuffer]);
            const formData = new FormData();
            formData.append('encryptedFile', blob, file.name + ".enc");
            formData.append('userId', user.id);

            await api.uploadFile(formData);
            
            setStatus('Başarılı! Dosya şifreli olarak saklandı.');
            setFile(null);
            onUploadSuccess(); // Listeyi yenilemesi için ana sayfayı uyar

        } catch (err) {
            console.error(err);
            setStatus('Hata: ' + err.message);
        }
    };

    return (
        <div className="upload-section">
            <h3>Güvenli Dosya Yükle</h3>
            <input type="file" onChange={e => setFile(e.target.files[0])} />
            <button onClick={handleUpload} disabled={!file}>
                Şifrele ve Yükle 🔒
            </button>
            <p>{status}</p>
        </div>
    );
}