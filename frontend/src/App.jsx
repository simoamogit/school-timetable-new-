import { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import SetupPage from './pages/SetupPage.jsx';
import TimetablePage from './pages/TimetablePage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import api from './api/index.js';

// Animated loading screen
function LoadingScreen({ slow }) {
  const COLORS = ['#2563eb','#7c3aed','#db2777','#16a34a','#ea580c','#0d9488','#ca8a04','#dc2626'];
  const cells = Array.from({ length: 30 }, (_, i) => ({
    color: COLORS[i % COLORS.length],
    delay: (i * 0.06).toFixed(2),
    empty: i % 5 === 3 || i % 7 === 0,
  }));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', height: '100vh', gap: 32,
      background: 'var(--bg)',
    }}>
      <style>{`
        @keyframes cellPop {
          0% { opacity: 0; transform: scale(0.7); }
          60% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ldbar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>

      {/* Mini timetable animation */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 36px)',
        gap: 3, opacity: 0.8
      }}>
        {cells.map((c, i) => (
          <div key={i} style={{
            height: 28, borderRadius: 4,
            background: c.empty ? 'var(--bg3)' : c.color,
            border: c.empty ? '1px solid var(--border)' : 'none',
            animation: `cellPop 0.35s ease ${c.delay}s both`,
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)',
          letterSpacing: '0.15em' }}>
          ORARIO SCOLASTICO
        </div>
        <div style={{ width: 200, height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--primary)',
            animation: 'ldbar 1.4s ease-in-out infinite', borderRadius: 1 }} />
        </div>
        {slow && (
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center',
            maxWidth: 240, lineHeight: 1.7 }}>
            Il server si sta svegliando.<br />
            <span style={{ color: 'var(--primary)' }}>Attendi qualche secondo...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('loading');
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [slowLoad, setSlowLoad] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (!token) { setPage('landing'); return; }
    setUser({ username });

    const cached = localStorage.getItem('timetable_cache');
    if (!navigator.onLine && cached) {
      try {
        const data = JSON.parse(cached);
        if (data.settings?.theme) setTheme(data.settings.theme);
        setPage(data.settings?.setupComplete ? 'timetable' : 'setup');
        return;
      } catch (_) {}
    }

    const slowTimer = setTimeout(() => setSlowLoad(true), 3000);

    api.get('/timetable/all')
      .then(res => {
        clearTimeout(slowTimer);
        const { settings } = res.data;
        localStorage.setItem('timetable_cache', JSON.stringify(res.data));
        if (settings.theme) setTheme(settings.theme);
        setPage(settings.setupComplete ? 'timetable' : 'setup');
      })
      .catch(() => {
        clearTimeout(slowTimer);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (data.settings?.theme) setTheme(data.settings.theme);
            setPage(data.settings?.setupComplete ? 'timetable' : 'setup');
            return;
          } catch (_) {}
        }
        setPage('landing');
      });

    return () => clearTimeout(slowTimer);
  }, []);

  const handleLogin = ({ token, username, setupComplete }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    setUser({ username });
    setPage(setupComplete ? 'timetable' : 'setup');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('timetable_cache');
    setUser(null);
    setPage('landing');
  };

  const handleThemeChange = (t) => {
    setTheme(t);
    api.post('/timetable/settings/theme', { theme: t }).catch(() => {});
  };

  if (page === 'loading') return <LoadingScreen slow={slowLoad} />;
  if (page === 'landing') return <LandingPage onGetStarted={() => setPage('auth')} />;
  if (page === 'auth') return <AuthPage onLogin={handleLogin} onBack={() => setPage('landing')} />;
  if (page === 'setup') return <SetupPage onComplete={() => setPage('timetable')} />;
  return (
    <TimetablePage
      user={user}
      onLogout={handleLogout}
      theme={theme}
      onThemeChange={handleThemeChange}
      isOnline={isOnline}
    />
  );
}