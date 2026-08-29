import { useState } from 'react';
import { createPortal } from 'react-dom';

const MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const DOW = ['D','L','M','M','G','V','S'];

function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fromIso(iso) { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d); }

function Calendar({ selected, min, onPick, onClose }) {
  const initial = selected ? fromIso(selected) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [pending, setPending] = useState(selected ? fromIso(selected) : null);

  const today = new Date();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const minDate = min ? fromIso(min) : null;

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const changeMonth = delta => {
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
  };

  const headline = pending
    ? pending.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })
    : 'Seleziona data';

  return createPortal(
    <div className="dialog-overlay" onClick={onClose}>
      <div className="datepicker-popover" onClick={e => e.stopPropagation()}>
        <div className="datepicker-header">
          <div className="label-sm">Seleziona data</div>
          <div className="headline">
            <span style={{ textTransform: 'capitalize' }}>{headline}</span>
            <span className="icon" style={{ fontSize: 20, color: 'var(--text2)' }}>edit</span>
          </div>
        </div>

        <div className="datepicker-nav">
          <div className="datepicker-month-label" style={{ textTransform: 'capitalize' }}>
            {MONTHS[viewMonth]} {viewYear}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn-icon" style={{ minWidth: 32, minHeight: 32 }} onClick={() => changeMonth(-1)}>
              <span className="icon" style={{ fontSize: 20 }}>chevron_left</span>
            </button>
            <button className="btn-icon" style={{ minWidth: 32, minHeight: 32 }} onClick={() => changeMonth(1)}>
              <span className="icon" style={{ fontSize: 20 }}>chevron_right</span>
            </button>
          </div>
        </div>

        <div className="datepicker-grid">
          {DOW.map((d, i) => <div key={i} className="datepicker-dow">{d}</div>)}
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="datepicker-day empty" />;
            const d = new Date(viewYear, viewMonth, day);
            const isToday = d.toDateString() === today.toDateString();
            const isSelected = pending && d.toDateString() === pending.toDateString();
            const disabled = minDate && d < minDate && d.toDateString() !== minDate.toDateString();
            return (
              <button key={i}
                className={`datepicker-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                disabled={disabled}
                style={disabled ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
                onClick={() => setPending(d)}>
                {day}
              </button>
            );
          })}
        </div>

        <div className="datepicker-actions">
          <button className="btn-ghost" style={{ border: 'none', color: 'var(--primary)' }} onClick={onClose}>Annulla</button>
          <button className="btn-ghost" style={{ border: 'none', color: 'var(--primary)' }}
            onClick={() => { if (pending) onPick(toIso(pending)); onClose(); }}>OK</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Sostituisce <input type="date">: stesso value/onChange (stringa ISO
// yyyy-mm-dd) così si integra senza cambiare la logica dei chiamanti.
export default function DatePicker({ value, onChange, min, placeholder = 'Seleziona data' }) {
  const [open, setOpen] = useState(false);
  const display = value
    ? fromIso(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
    : placeholder;

  return (
    <>
      <button type="button" className="datepicker-field" onClick={() => setOpen(true)}>
        <span style={{ color: value ? 'var(--text)' : 'var(--text3)' }}>{display}</span>
        <span className="icon" style={{ fontSize: 20, color: 'var(--text2)' }}>calendar_month</span>
      </button>
      {open && (
        <Calendar selected={value} min={min} onPick={onChange} onClose={() => setOpen(false)} />
      )}
    </>
  );
}