// frontend/src/App.jsx
import { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import SetupPage from './pages/SetupPage.jsx';
import TimetablePage from './pages/TimetablePage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoadingIndicator from './components/LoadingIndicator.jsx';
import api from './api/index.js';

// Loading screen — usa il Loading Indicator M3 Expressive (forma che morfa)
function LoadingScreen({ slow }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', height: '100vh', gap: 28,
      background: 'var(--bg)',
    }}>
      <LoadingIndicator size={64} contained duration={2.6} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)',
          letterSpacing: '0.15em' }}>
          ORARIO SCOLASTICO
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