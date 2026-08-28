// frontend/src/pages/SetupPage.jsx
import { useState } from 'react';
import api from '../api/index.js';

const ALL_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export default function SetupPage({ onComplete }) {
  const [selectedDays, setSelectedDays] = useState(['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì']);
  const [hoursPerDay, setHoursPerDay] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = day => setSelectedDays(prev =>
    prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
  );

  const save = async () => {
    if (selectedDays.length === 0) return setError('Seleziona almeno un giorno');
    setLoading(true);
    try {
      const ordered = ALL_DAYS.filter(d => selectedDays.includes(d));
      await api.post('/timetable/settings', { schoolDays: ordered, hoursPerDay: Number(hoursPerDay) });
      onComplete();
    } catch (e) {
      setError(e.response?.data?.error || 'Errore nel salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--primary)', letterSpacing: '0.12em', marginBottom: 10, fontWeight: 600 }}>
            PRIMO ACCESSO
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.01em' }}>Configura il tuo orario</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 6 }}>Potrai modificarlo in seguito dalle impostazioni.</p>
        </div>

        <div className="card-surface" style={{ padding: 24 }}>
          {error && (
            <div style={{ background: 'var(--error-container)', borderRadius: 'var(--radius-md)',
              padding: '12px 14px', marginBottom: 18, color: 'var(--on-error-container)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 22 }}>
            <label className="label">Giorni scolastici</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {ALL_DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`chip${selectedDays.includes(day) ? ' selected' : ''}`}
                >
                  {selectedDays.includes(day) && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">
              Ore massime per giorno —{' '}
              <span style={{ color: 'var(--primary)', fontFamily: 'var(--mono)', fontWeight: 700 }}>{hoursPerDay}</span>
            </label>
            <input type="range" min="1" max="12" value={hoursPerDay}
              onChange={e => setHoursPerDay(e.target.value)} style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--mono)' }}>
              <span>1</span><span>12</span>
            </div>
          </div>

          <div style={{ background: 'var(--primary-container)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 22,
            fontSize: 13, color: 'var(--on-primary-container)' }}>
            {selectedDays.length} giorni × {hoursPerDay} ore max ={' '}
            <strong style={{ fontFamily: 'var(--mono)' }}>{selectedDays.length * hoursPerDay} celle</strong>
          </div>

          <button className="btn-primary" onClick={save} disabled={loading} style={{ width: '100%', padding: 14, fontSize: 15 }}>
            {loading ? 'Salvataggio...' : 'Crea orario'}
          </button>
        </div>
      </div>
    </div>
  );
}