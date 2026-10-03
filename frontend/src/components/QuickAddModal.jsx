import { useState, useMemo } from 'react';
import DatePicker from './DatePicker.jsx';
import { addDays, dayName, fromIso, toIso, TASK_KINDS } from '../utils/dates.js';

// Prima data (da oggi in poi, oggi incluso) che cade nel giorno della settimana indicato.
function nextDateFor(day) {
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    if (dayName(d) === day) return toIso(d);
  }
  return '';
}

function defaultDay(schoolDays) {
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const n = dayName(addDays(today, i));
    if (schoolDays.includes(n)) return n;
  }
  return schoolDays[0] || '';
}

// Modal separato per aggiungere al volo una nota, un compito o una verifica,
// senza passare dall'apertura della singola cella.
export default function QuickAddModal({ initialKind = 'test', schoolDays, hours, slots, onClose, onAdd }) {
  const [kind, setKind] = useState(initialKind);
  const [day, setDay] = useState(() => defaultDay(schoolDays));
  const [hour, setHour] = useState(hours[0] || 1);
  const [date, setDate] = useState(() => (initialKind === 'note' ? '' : nextDateFor(defaultDay(schoolDays))));
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const slotOf = (d, h) => slots.find(s => s.day === d && s.hour === h);
  const label = (h) => {
    const s = slotOf(day, h);
    const what = s?.slot_type === 'free' ? 'ora libera' : s?.subject || 'vuota';
    return `${h}ª ora — ${what}`;
  };

  const dateDay = date ? dayName(fromIso(date)) : null;
  const dateOk = !date || schoolDays.includes(dateDay);

  const changeKind = (k) => {
    setKind(k);
    if (k !== 'note' && !date) setDate(nextDateFor(day)); // compiti/verifiche: data suggerita
  };
  const changeDay = (d) => {
    setDay(d);
    if (date || kind !== 'note') setDate(nextDateFor(d));
  };
  const changeDate = (iso) => {
    setDate(iso);
    if (iso) {
      const d = dayName(fromIso(iso));
      if (schoolDays.includes(d)) setDay(d);
    }
  };

  const canSave = content.trim() && day && hour && dateOk && !busy;
  const meta = TASK_KINDS[kind];
  const subject = slotOf(day, hour)?.subject;

  const submit = async () => {
    if (!canSave) return;
    setBusy(true); setError('');
    try {
      await onAdd({ day, hour, content: content.trim(), note_date: date || null, kind });
      onClose();
    } catch {
      setError('Non sono riuscito a salvare. Riprova.');
      setBusy(false);
    }
  };

  const placeholder = kind === 'test' ? 'Es. Verifica sulle derivate' : kind === 'homework' ? 'Es. Esercizi pag. 20 n. 1-8' : 'Scrivi la nota...';
  const dateLabel = kind === 'note' ? 'Data (la nota viene eliminata il giorno dopo)' : kind === 'test' ? 'Data della verifica' : 'Data di consegna';

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Aggiungi nota, compito o verifica"
        style={{ maxHeight: '90dvh', overflowY: 'auto', maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 400 }}>Aggiungi</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Chiudi"><span className="icon">close</span></button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-200)' }}>
          {Object.entries(TASK_KINDS).map(([k, v]) => (
            <button key={k} onClick={() => changeKind(k)} className={kind === k ? 'btn-tonal' : 'btn-ghost'}
              style={{ flex: 1, padding: 9, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="icon" style={{ fontSize: 16 }}>{v.icon}</span> {v.label}
            </button>
          ))}
        </div>

        <div className="form-group">
          <label className="label">{meta.label}</label>
          <textarea placeholder={placeholder} value={content} rows={3} style={{ resize: 'vertical' }}
            onChange={e => setContent(e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Giorno</label>
            <select value={day} onChange={e => changeDay(e.target.value)}>
              {schoolDays.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Ora</label>
            <select value={hour} onChange={e => setHour(Number(e.target.value))}>
              {hours.map(h => <option key={h} value={h}>{label(h)}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="label">{dateLabel}</label>
          <DatePicker value={date} onChange={changeDate} placeholder="Nessuna scadenza" />
          {!dateOk && (
            <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>
              {dateDay} non è un giorno di scuola: scegli un'altra data.
            </div>
          )}
        </div>

        {subject && (
          <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 'var(--space-150)' }}>
            {subject} · {day}{date ? ` ${fromIso(date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}` : ''}
          </div>
        )}
        {error && <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1, padding: 12 }}>Annulla</button>
          <button className="btn-primary" onClick={submit} disabled={!canSave} style={{ flex: 2, padding: 12 }}>
            {busy ? 'Salvataggio...' : `Aggiungi ${meta.label.toLowerCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
