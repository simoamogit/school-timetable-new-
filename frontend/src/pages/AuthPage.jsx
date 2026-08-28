// frontend/src/pages/AuthPage.jsx
import { useState } from 'react';
import api from '../api/index.js';
import TextField from '../components/TextField.jsx';

export default function AuthPage({ onLogin, onBack }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password };
      const res = await api.post(endpoint, payload);
      onLogin(res.data);
    } catch (e) {
      // Distingue "il server non risponde affatto" (timeout, down, DB
      // irraggiungibile) da un errore applicativo vero e proprio (es.
      // credenziali sbagliate), invece di mostrare sempre "Errore di rete".
      setError(
        e.isUnreachable
          ? 'Il server non risponde. Se non usi l\'app da un po\', potrebbe doversi "svegliare": riprova tra circa un minuto.'
          : e.response?.data?.error || 'Errore di rete'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
      background: 'var(--bg)'
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--primary)', letterSpacing: '0.12em', marginBottom: 10, fontWeight: 600 }}>
            ORARIO SCOLASTICO
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {mode === 'login' ? 'Bentornato' : 'Crea account'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6 }}>
            {mode === 'login' ? 'Accedi per continuare' : 'Ci vuole un minuto'}
          </p>
          {onBack && (
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: 'var(--text3)',
              fontSize: 12, cursor: 'pointer', padding: '18px 0 0 0', borderRadius: 0,
              fontFamily: 'var(--mono)', letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              ← torna alla home
            </button>
          )}
        </div>

        {error && (
          <div style={{
            background: 'var(--error-container)', border: 'none',
            borderRadius: 'var(--radius-md)', padding: '12px 14px',
            marginBottom: 18, color: 'var(--on-error-container)', fontSize: 13, lineHeight: 1.5
          }}>
            {error}
          </div>
        )}

        {mode === 'register' && (
          <TextField label="Username" placeholder="username" value={form.username} onChange={update('username')}
            style={{ marginBottom: 14 }} />
        )}
        <TextField label="Email" type="email" placeholder="nome@email.it" value={form.email} onChange={update('email')}
          style={{ marginBottom: 14 }} />
        <TextField label="Password" type="password" placeholder="••••••••" value={form.password}
          onChange={update('password')} onKeyDown={e => e.key === 'Enter' && submit()}
          style={{ marginBottom: 24 }} />

        <button className="btn-primary" onClick={submit} disabled={loading}
          style={{ width: '100%', padding: 14, marginBottom: 16, fontSize: 15 }}>
          {loading ? 'Attendi...' : mode === 'login' ? 'Accedi' : 'Registrati'}
        </button>

        <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
          style={{
            background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', padding: '8px 4px', borderRadius: 'var(--radius-sm)', width: '100%'
          }}>
          {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
        </button>
      </div>
    </div>
  );
}