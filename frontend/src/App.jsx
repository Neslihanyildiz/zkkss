import { useState } from 'react'; // useEffect artık gerekmiyor, kaldırdık.
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  // LAZY INITIALIZATION (Tembel Başlatma)
  // localStorage kontrolünü doğrudan state'in başlangıç değerine koyuyoruz.
  // Bu sayede useEffect kullanmadan, sayfa açılır açılmaz veriyi okuyoruz.
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    // Güvenlik için private key'leri de temizleyebiliriz (Opsiyonel ama önerilir)
    // localStorage.removeItem(`priv_${user.username}`);
  };

  return (
    <div className="app-container">
      {/* Başlık her zaman görünsün istersen buraya, 
          sadece login ekranında görünsün istersen Login componentine taşıyabilirsin. 
          Şimdilik senin yapını koruyorum: */}
      <h1 className="main-title">ZK-Secure Storage 🛡️</h1>
      
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;