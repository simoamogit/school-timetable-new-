import { useState } from 'react';
import api from '../api/index.js';

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
      setError(e.response?.data?.error || 'Errore di rete');
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
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.12em', marginBottom: 8 }}>
            ORARIO SCOLASTICO
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>
            {mode === 'login' ? 'Accedi' : 'Crea account'}
          </h1>
          {onBack && (
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
              fontSize: 12, cursor: 'pointer', padding: '0 0 16px 0',
              fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              ← torna alla home
            </button>
          )}
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg)', border: '1px solid var(--danger)',
            borderRadius: 'var(--radius)', padding: '8px 12px',
            marginBottom: 16, color: 'var(--danger)', fontSize: 13
          }}>
            {error}
          </div>
        )}

        {mode === 'register' && (
          <div className="form-group">
            <label className="label">Username</label>
            <input placeholder="username" value={form.username} onChange={update('username')} />
          </div>
        )}
        <div className="form-group">
          <label className="label">Email</label>
          <input type="email" placeholder="nome@email.it" value={form.email} onChange={update('email')} />
        </div>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="label">Password</label>
          <input type="password" placeholder="••••••••" value={form.password}
            onChange={update('password')} onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>

        <button className="btn-primary" onClick={submit} disabled={loading}
          style={{ width: '100%', padding: 10, marginBottom: 12 }}>
          {loading ? 'Attendi...' : mode === 'login' ? 'Accedi' : 'Registrati'}
        </button>

        <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
          style={{
            background: 'none', border: 'none', color: 'var(--text2)', fontSize: 13,
            cursor: 'pointer', padding: 0, textDecoration: 'underline'
          }}>
          {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
        </button>
      </div>
    </div>
  );
}