import { useState } from 'react';
import { api } from '../services/api';
import { generateRSAKeyPair, exportKey } from '../utils/rsa';

export default function Login({ onLogin }) {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('');
        setIsLoading(true);

        try {
            if (isRegister) {
               // 1. Önce Anahtarları Üret
                setStatus('🔐 Anahtarlar oluşturuluyor...');
                const keyPair = await generateRSAKeyPair();
                
                const pubKeyStr = await exportKey(keyPair.publicKey);
                const privKeyStr = await exportKey(keyPair.privateKey);

                // 2. Kayıt Ol (Public Key'i de gönderiyoruz!)
                const res = await api.register(username, password, pubKeyStr);
                
                if (res.error) throw new Error(res.error);
                
                // 3. Anahtarları LocalStorage'a kaydet
                localStorage.setItem(`pub_${username}`, pubKeyStr);
                localStorage.setItem(`priv_${username}`, privKeyStr);

                setStatus('✅ Kayıt başarılı! Giriş yapılıyor...');
                setTimeout(() => {
                    setIsRegister(false);
                    setStatus('');
                }, 1500);
            } else {
                // Giriş İşlemleri
                const res = await api.login(username, password);
                if (res.user) {
                    const privKey = localStorage.getItem(`priv_${username}`);
                    if (!privKey) {
                        alert("Uyarı: Bu tarayıcıda Private Key bulunamadı.");
                    }
                    onLogin(res.user);
                }
            }
        } catch (err) {
            setStatus('❌ Hata: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            {/* SOL TARAF: Görsel ve Vizyon */}
            <div className="login-visual-side">
                <div className="visual-content">
                    <h1>ZK-SecureStorage</h1>
                    <div className="features">
                        <div className="feature-item">
                            <span className="icon">🛡️</span>
                            <span>Uçtan Uca Şifreleme (E2EE)</span>
                        </div>
                        <div className="feature-item">
                            <span className="icon">👁️</span>
                            <span>Kör Sunucu (Blind Server) Mimarisi</span>
                        </div>
                        <div className="feature-item">
                            <span className="icon">📜</span>
                            <span>Değiştirilemez Denetim Kayıtları</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SAĞ TARAF: Form Alanı */}
            <div className="login-form-side">
                <div className="form-container">
                    <div className="form-header">
                        <h2>{isRegister ? 'Hesap Oluştur' : 'Tekrar Hoşgeldiniz'}</h2>
                        <p>{isRegister ? 'Güvenli depolama alanınıza erişmek için kaydolun.' : 'Dosyalarınıza erişmek için giriş yapın.'}</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>Kullanıcı Adı</label>
                            <input 
                                type="text" 
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required 
                                placeholder="Örn: arastirmaci01"
                            />
                        </div>
                        
                        <div className="input-group">
                            <label>Şifre</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required 
                                placeholder="••••••••"
                            />
                        </div>

                        <button type="submit" className="primary-btn" disabled={isLoading}>
                            {isLoading ? 'İşleniyor...' : (isRegister ? 'Kayıt Ol & Anahtar Üret' : 'Güvenli Giriş')}
                        </button>
                    </form>

                    {status && <div className={`status-msg ${status.includes('Hata') ? 'error' : 'success'}`}>{status}</div>}

                    <div className="form-footer">
                        <p>
                            {isRegister ? 'Zaten hesabınız var mı?' : 'Hesabınız yok mu?'}
                            <button className="text-btn" onClick={() => setIsRegister(!isRegister)}>
                                {isRegister ? 'Giriş Yap' : 'Hemen Kaydol'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}