import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/index.js';
import TodayView from './TodayView.jsx';

const PRESET_COLORS = [
  '#2563eb','#7c3aed','#db2777','#dc2626',
  '#ea580c','#ca8a04','#16a34a','#0d9488',
  '#0891b2','#475569'
];

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const EyeIcon = ({ closed }) => closed ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

// ─── Clock ────────────────────────────────────────────────────────────────────
function ClockWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 30,
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', textAlign: 'right',
      boxShadow: 'var(--shadow)'
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 600,
        color: 'var(--text)', letterSpacing: '0.04em' }}>
        {now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)',
        marginTop: 2, letterSpacing: '0.04em' }}>
        {now.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
      </div>
    </div>
  );
}

// ─── NoteTooltip ─────────────────────────────────────────────────────────────
function NoteTooltip({ notes }) {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState(null);
  const ref = useRef(null);
  if (!notes.length) return null;
  const handleEnter = () => { if (ref.current) setRect(ref.current.getBoundingClientRect()); setVisible(true); };
  return (
    <>
      <span ref={ref} onMouseEnter={handleEnter} onMouseLeave={() => setVisible(false)}
        style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
          background: 'rgba(0,0,0,0.25)', borderRadius: 3, padding: '1px 5px',
          color: 'white', cursor: 'default', userSelect: 'none' }}>
        {notes.length}n
      </span>
      {visible && rect && createPortal(
        <div style={{
          position: 'fixed',
          left: Math.min(Math.max(rect.left + rect.width / 2, 130), window.innerWidth - 130),
          ...(rect.top > 180 ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
          transform: 'translateX(-50%)',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 12px', width: 240, zIndex: 9999,
          boxShadow: 'var(--shadow-lg)', pointerEvents: 'none'
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--mono)' }}>
            Note
          </div>
          {notes.map((n, i) => (
            <div key={n.id} style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5,
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              paddingTop: i > 0 ? 8 : 0, marginTop: i > 0 ? 8 : 0 }}>
              {n.content}
              {n.note_date && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                {new Date(n.note_date).toLocaleDateString('it-IT')}
              </div>}
            </div>
          ))}
        </div>, document.body
      )}
    </>
  );
}

// ─── TimetableCell ────────────────────────────────────────────────────────────
function TimetableCell({ day, hour, slot, cellNotes, cellSubs, isLocked, isDragOver, isDragging,
  onClick, onDragStart, onDragOver, onDragLeave, onDrop }) {
  const isEmpty = !slot?.subject && slot?.slot_type !== 'free';
  const isFree = slot?.slot_type === 'free';
  const latestSub = cellSubs.length
    ? [...cellSubs].sort((a, b) => new Date(a.sub_date) - new Date(b.sub_date))[0]
    : null;
  const hasSub = !!latestSub;

  return (
    <div
      draggable={!isLocked && !!slot?.subject && !isFree}
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onClick={onClick}
      className={[
        isDragOver ? 'cell-drag-over' : '',
        isDragging ? 'cell-dragging' : '',
        isFree ? 'cell-free' : ''
      ].join(' ')}
      style={{
        background: hasSub ? 'var(--warning-bg)' : isFree ? 'var(--free-bg)' : isEmpty ? 'var(--bg)' : slot.color,
        border: `1px solid ${hasSub ? 'var(--warning)' : isFree ? 'var(--free)' : isEmpty ? 'var(--border)' : slot.color}`,
        borderRadius: 4, padding: '6px 4px', cursor: 'pointer', minHeight: 72,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3, position: 'relative', transition: 'opacity 0.1s', userSelect: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {isFree && !hasSub ? (
        <span style={{ fontSize: 9, color: 'var(--free)', fontFamily: 'var(--mono)',
          fontWeight: 600, letterSpacing: '0.05em' }}>LIBERA</span>
      ) : isEmpty && !hasSub ? (
        <span style={{ fontSize: 18, color: 'var(--border2)', fontWeight: 300, lineHeight: 1 }}>
          {isLocked ? '—' : '+'}
        </span>
      ) : hasSub ? (
        <>
          {slot?.subject && (
            <span style={{ fontSize: 9, color: 'var(--text3)', textDecoration: 'line-through',
              textDecorationColor: 'var(--warning)', maxWidth: '100%', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>
              {slot.subject}
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', textAlign: 'center',
            lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', padding: '0 3px' }}>
            {latestSub.substitute}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {new Date(latestSub.sub_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
          </span>
          {cellNotes.length > 0 && <div onClick={e => e.stopPropagation()}><NoteTooltip notes={cellNotes} /></div>}
        </>
      ) : (
        <>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'white', lineHeight: 1.2, textAlign: 'center',
            maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            {slot.subject}
          </span>
          {cellNotes.length > 0 && <div onClick={e => e.stopPropagation()}><NoteTooltip notes={cellNotes} /></div>}
        </>
      )}
    </div>
  );
}

// ─── CellModal ────────────────────────────────────────────────────────────────
function CellModal({ cell, hours, isLocked, notes, substitutions, initialTab,
  onClose, onSave, onDelete, onAddNote, onEditNote, onDeleteNote, onAddSub, onEditSub, onDeleteSub }) {

  const [tab, setTab] = useState(initialTab || (isLocked ? 'notes' : 'edit'));
  const [subject, setSubject] = useState(cell.subject || '');
  const [color, setColor] = useState(cell.color || '#2563eb');
  const [slotType, setSlotType] = useState(cell.slot_type || 'subject');

  // Note state
  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [editNoteDate, setEditNoteDate] = useState('');

  // Sub state
  const [subText, setSubText] = useState('');
  const [subHourFrom, setSubHourFrom] = useState(cell.hour);
  const [subHourTo, setSubHourTo] = useState(cell.hour);
  const [subDate, setSubDate] = useState(new Date().toISOString().split('T')[0]);
  const [subNote, setSubNote] = useState('');
  const [editingSubId, setEditingSubId] = useState(null);
  const [editSub, setEditSub] = useState({});

  const cellNotes = notes
    .filter(n => n.day === cell.day && n.hour === cell.hour)
    .sort((a, b) => {
      if (a.note_date && b.note_date) return new Date(a.note_date) - new Date(b.note_date);
      if (a.note_date) return -1;
      if (b.note_date) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const cellSubs = substitutions
    .filter(s => s.day === cell.day && s.hour === cell.hour)
    .sort((a, b) => new Date(a.sub_date) - new Date(b.sub_date));

  const saveSlot = () => { onSave({ day: cell.day, hour: cell.hour, subject, color, slot_type: slotType }); onClose(); };

  const addNote = async () => {
    if (!noteContent.trim()) return;
    await onAddNote({ day: cell.day, hour: cell.hour, content: noteContent, note_date: noteDate || null });
    setNoteContent(''); setNoteDate('');
  };

  const startEditNote = (n) => {
    setEditingNoteId(n.id);
    setEditNoteContent(n.content);
    setEditNoteDate(n.note_date || '');
  };
  const saveEditNote = async () => {
    await onEditNote(editingNoteId, { content: editNoteContent, note_date: editNoteDate || null });
    setEditingNoteId(null);
  };

  const addSub = async () => {
    if (!subText.trim() || !subDate) return;
    await onAddSub({ day: cell.day, hour: subHourFrom, hour_to: subHourTo, substitute: subText, sub_date: subDate, note: subNote });
    setSubText(''); setSubNote('');
  };

  const startEditSub = (s) => {
    setEditingSubId(s.id);
    setEditSub({ substitute: s.substitute, hour: s.hour, hour_to: s.hour_to || s.hour, sub_date: s.sub_date, note: s.note || '' });
  };
  const saveEditSub = async () => {
    await onEditSub(editingSubId, editSub);
    setEditingSubId(null);
  };

  const tabs = [
    ...(isLocked ? [] : [{ id: 'edit', label: 'Materia' }]),
    { id: 'notes', label: `Note${cellNotes.length ? ` (${cellNotes.length})` : ''}` },
    { id: 'subs', label: `Supplenze${cellSubs.length ? ` (${cellSubs.length})` : ''}` }
  ];

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)',
              letterSpacing: '0.1em', marginBottom: 4 }}>
              {cell.day.toUpperCase()} · ORA {cell.hour}
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 600 }}>
              {slotType === 'free' ? 'Ora libera' : cell.subject || 'Cella vuota'}
            </h2>
            {isLocked && <span style={{ fontSize: 11, color: 'var(--warning)', fontFamily: 'var(--mono)' }}>BLOCCATO</span>}
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {tabs.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Materia ── */}
        {tab === 'edit' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {[{ v: 'subject', l: 'Materia' }, { v: 'free', l: 'Ora libera' }].map(opt => (
                <button key={opt.v} onClick={() => setSlotType(opt.v)} style={{
                  flex: 1, padding: '9px', fontSize: 13, fontWeight: 600, borderRadius: 6,
                  border: '1px solid',
                  borderColor: slotType === opt.v ? (opt.v === 'free' ? 'var(--free)' : 'var(--primary)') : 'var(--border)',
                  background: slotType === opt.v ? (opt.v === 'free' ? 'var(--free-bg)' : 'var(--primary-bg)') : 'transparent',
                  color: slotType === opt.v ? (opt.v === 'free' ? 'var(--free)' : 'var(--primary)') : 'var(--text2)'
                }}>
                  {opt.l}
                </button>
              ))}
            </div>

            {slotType === 'subject' && (
              <>
                <div className="form-group">
                  <label className="label">Nome materia</label>
                  <input placeholder="es. Matematica" value={subject}
                    onChange={e => setSubject(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveSlot()} autoFocus />
                </div>
                <div className="form-group">
                  <label className="label">Colore</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => setColor(c)} style={{
                        width: 32, height: 32, borderRadius: 6, background: c, padding: 0,
                        border: color === c ? '2px solid var(--text)' : '2px solid transparent',
                        outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 1
                      }} />
                    ))}
                    <input type="color" value={color} onChange={e => setColor(e.target.value)}
                      style={{ width: 32, height: 32, border: '1px solid var(--border)', padding: 2, borderRadius: 6 }} />
                  </div>
                </div>
                <div style={{ borderLeft: `3px solid ${color}`, padding: '10px 14px', marginBottom: 20,
                  background: 'var(--bg2)', borderRadius: '0 6px 6px 0' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{subject || 'Anteprima'}</span>
                </div>
              </>
            )}

            {slotType === 'free' && (
              <div style={{ background: 'var(--free-bg)', border: '1px solid var(--free)', borderRadius: 8,
                padding: '12px 16px', marginBottom: 20, color: 'var(--free)', fontSize: 13 }}>
                Mostrata come buco / ora libera nella tabella.
              </div>
            )}

            {cell.subject && (
              <button onClick={() => {
                if (window.confirm(`Eliminare "${cell.subject}" da ${cell.day} ora ${cell.hour}?`)) {
                  onDelete({ day: cell.day, hour: cell.hour });
                  onClose();
                }
              }} style={{
                width: '100%', marginBottom: 10, padding: 10, fontSize: 13,
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', color: 'var(--danger)', cursor: 'pointer', fontFamily: 'var(--font)'
              }}>
                Svuota cella
              </button>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={onClose} style={{ flex: 1, padding: 12 }}>Annulla</button>
              <button className="btn-primary" onClick={saveSlot} style={{ flex: 2, padding: 12 }}>Salva</button>
            </div>
          </div>
        )}

        {/* ── Tab Note ── */}
        {tab === 'notes' && (
          <div>
            <div className="form-group">
              <label className="label">Nuova nota</label>
              <textarea placeholder="Nota per questa lezione..." value={noteContent}
                onChange={e => setNoteContent(e.target.value)} rows={3}
                style={{ resize: 'vertical' }} autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Data (eliminata il giorno dopo)</label>
              <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={addNote} disabled={!noteContent.trim()}
              style={{ width: '100%', marginBottom: 20, padding: 12 }}>
              Aggiungi nota
            </button>

            {cellNotes.length === 0
              ? <div className="empty-state">Nessuna nota.</div>
              : cellNotes.map(n => (
                <div key={n.id} className="note-card">
                  {editingNoteId === n.id ? (
                    <div style={{ width: '100%' }}>
                      <textarea value={editNoteContent} onChange={e => setEditNoteContent(e.target.value)}
                        rows={2} style={{ resize: 'vertical', marginBottom: 8 }} />
                      <input type="date" value={editNoteDate} onChange={e => setEditNoteDate(e.target.value)}
                        style={{ marginBottom: 8 }} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" onClick={() => setEditingNoteId(null)}
                          style={{ flex: 1, padding: '7px' }}>Annulla</button>
                        <button className="btn-primary" onClick={saveEditNote}
                          style={{ flex: 2, padding: '7px' }}>Salva</button>
                      </div>
                    </div>
                  ) : (
                    <div className="note-card-header" style={{ width: '100%' }}>
                      <div style={{ flex: 1 }}>
                        <p>{n.content}</p>
                        {n.note_date && <span className="meta">{new Date(n.note_date).toLocaleDateString('it-IT')}</span>}
                      </div>
                      <div className="note-card-actions">
                        <button className="btn-edit" onClick={() => startEditNote(n)} title="Modifica">
                          <PencilIcon />
                        </button>
                        <button className="btn-danger" onClick={() => onDeleteNote(n.id)}
                          style={{ padding: '4px 9px', fontSize: 13 }}>×</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {/* ── Tab Supplenze ── */}
        {tab === 'subs' && (
          <div>
            <div className="form-group">
              <label className="label">Supplente / materia alternativa</label>
              <input placeholder="es. Prof. Rossi" value={subText}
                onChange={e => setSubText(e.target.value)} autoFocus />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Ora inizio</label>
                <select value={subHourFrom} onChange={e => {
                  setSubHourFrom(Number(e.target.value));
                  setSubHourTo(t => Math.max(t, Number(e.target.value)));
                }}>
                  {hours.map(h => <option key={h} value={h}>{h}ª ora</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Ora fine</label>
                <select value={subHourTo} onChange={e => setSubHourTo(Number(e.target.value))}>
                  {hours.filter(h => h >= subHourFrom).map(h => <option key={h} value={h}>{h}ª ora</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Data *</label>
              <input type="date" value={subDate} onChange={e => setSubDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Nota (opzionale)</label>
              <input placeholder="Dettagli..." value={subNote} onChange={e => setSubNote(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={addSub} disabled={!subText.trim() || !subDate}
              style={{ width: '100%', marginBottom: 20, padding: 12 }}>
              Aggiungi supplenza
            </button>

            {cellSubs.length === 0
              ? <div className="empty-state">Nessuna supplenza.</div>
              : cellSubs.map(s => (
                <div key={s.id} className="note-card">
                  {editingSubId === s.id ? (
                    <div style={{ width: '100%' }}>
                      <div className="form-group">
                        <input value={editSub.substitute}
                          onChange={e => setEditSub(p => ({ ...p, substitute: e.target.value }))} />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <select value={editSub.hour}
                            onChange={e => setEditSub(p => ({ ...p, hour: Number(e.target.value) }))}>
                            {hours.map(h => <option key={h} value={h}>{h}ª ora</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <select value={editSub.hour_to}
                            onChange={e => setEditSub(p => ({ ...p, hour_to: Number(e.target.value) }))}>
                            {hours.map(h => <option key={h} value={h}>{h}ª ora</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <input type="date" value={editSub.sub_date}
                          onChange={e => setEditSub(p => ({ ...p, sub_date: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <input placeholder="Nota..." value={editSub.note}
                          onChange={e => setEditSub(p => ({ ...p, note: e.target.value }))} />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" onClick={() => setEditingSubId(null)}
                          style={{ flex: 1, padding: '7px' }}>Annulla</button>
                        <button className="btn-primary" onClick={saveEditSub}
                          style={{ flex: 2, padding: '7px' }}>Salva</button>
                      </div>
                    </div>
                  ) : (
                    <div className="note-card-header" style={{ width: '100%' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600 }}>{s.substitute}</p>
                        <span className="meta">
                          {new Date(s.sub_date).toLocaleDateString('it-IT')}
                          {' · '}
                          {s.hour_to && s.hour_to !== s.hour ? `ore ${s.hour}–${s.hour_to}` : `ora ${s.hour}`}
                        </span>
                        {s.note && <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{s.note}</p>}
                      </div>
                      <div className="note-card-actions">
                        <button className="btn-edit" onClick={() => startEditSub(s)} title="Modifica">
                          <PencilIcon />
                        </button>
                        <button className="btn-danger" onClick={() => onDeleteSub(s.id)}
                          style={{ padding: '4px 9px', fontSize: 13 }}>×</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────
function SettingsPanel({ onClose, onReset, onExport, onImport, isLocked, onToggleLock,
  theme, onThemeChange, fileRef, hiddenHours, onRestoreHour, avatarColor, onAvatarColorChange,
  shareToken, onCreateShare, onDeleteShare, onLogout }) {

  const [tab, setTab] = useState('general');
  const [changelog, setChangelog] = useState([]);
  const [clLoading, setClLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadChangelog = async () => {
    setClLoading(true);
    try { const r = await api.get('/timetable/changelog'); setChangelog(r.data); }
    catch (_) {}
    finally { setClLoading(false); }
  };

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : null;

  const copyShare = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const actionLabel = (action, details) => {
    switch (action) {
      case 'slot_changed': return `${details.day} ora ${details.hour} · "${details.from}" → "${details.to}"`;
      case 'slot_free': return `${details.day} ora ${details.hour} · Ora libera`;
      case 'slot_deleted': return `${details.day} ora ${details.hour} · "${details.subject}" eliminata`;
      case 'slot_swapped': return `Scambiati: ${details.from?.day} ${details.from?.hour} ↔ ${details.to?.day} ${details.to?.hour}`;
      case 'note_added': return `Nota aggiunta · ${details.day} ora ${details.hour}`;
      case 'note_deleted': return `Nota eliminata · ${details.day} ora ${details.hour}`;
      case 'sub_added': return `Supplenza: ${details.substitute} · ${details.day} (${new Date(details.sub_date).toLocaleDateString('it-IT')})`;
      default: return action;
    }
  };

  const settingsTabs = [
    { id: 'general', label: 'Generale' },
    { id: 'share', label: 'Link' },
    { id: 'hours', label: hiddenHours.length ? `Ore (${hiddenHours.length})` : 'Ore' },
    { id: 'changelog', label: 'Log' },
  ];

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Impostazioni</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 18 }}>×</button>
        </div>

        <div className="tabs" style={{ marginBottom: 16 }}>
          {settingsTabs.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => { setTab(t.id); if (t.id === 'changelog') loadChangelog(); }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'general' && (
          <div>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
              borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 16, fontWeight: 700, color: 'white' }}>
                {(localStorage.getItem('username') || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Colore avatar</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => onAvatarColorChange(c)} style={{
                      width: 22, height: 22, borderRadius: '50%', background: c, padding: 0,
                      border: avatarColor === c ? '2px solid var(--text)' : '2px solid transparent' }} />
                  ))}
                  <input type="color" value={avatarColor} onChange={e => onAvatarColorChange(e.target.value)}
                    style={{ width: 22, height: 22, border: 'none', padding: 0,
                      borderRadius: '50%', cursor: 'pointer', background: 'transparent' }} />
                </div>
              </div>
            </div>

            {[
              { label: 'Tema scuro', sub: 'Modalità scura', checked: theme === 'dark', onChange: e => onThemeChange(e.target.checked ? 'dark' : 'light') },
              { label: 'Blocca orario', sub: 'Solo note e supplenze', checked: isLocked, onChange: onToggleLock },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{row.sub}</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={row.checked} onChange={row.onChange} />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={onExport} className="btn-ghost" style={{ textAlign: 'left', padding: 12 }}>Esporta dati (.json)</button>
              <button onClick={() => fileRef.current?.click()} className="btn-ghost" style={{ textAlign: 'left', padding: 12 }}>Importa dati (.json)</button>
              <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onImport} />
              <button onClick={onReset} style={{ textAlign: 'left', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                padding: 12, fontSize: 14, color: 'var(--danger)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Riconfigura orario
              </button>
              <button onClick={onLogout} style={{ textAlign: 'left', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                padding: 12, fontSize: 14, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Esci dall'account
              </button>
            </div>
          </div>
        )}

        {tab === 'share' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
              Link sola lettura — chiunque ce l'abbia può vedere il tuo orario senza account.
            </p>
            {!shareToken ? (
              <button className="btn-primary" onClick={onCreateShare} style={{ width: '100%', padding: 12 }}>
                Genera link
              </button>
            ) : (
              <div>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '10px 12px', marginBottom: 10,
                  fontFamily: 'var(--mono)', fontSize: 11, wordBreak: 'break-all', color: 'var(--text2)' }}>
                  {shareUrl}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" onClick={copyShare} style={{ flex: 2, padding: 12 }}>
                    {copied ? '✓ Copiato!' : 'Copia link'}
                  </button>
                  <button className="btn-danger" onClick={onDeleteShare} style={{ flex: 1, padding: 12 }}>Revoca</button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'hours' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Ore nascoste dalla tabella.
            </p>
            {hiddenHours.length === 0 ? (
              <div className="empty-state">Nessuna ora nascosta.<br />Hover sul numero ora → clicca ×</div>
            ) : (
              hiddenHours.sort((a, b) => a - b).map(h => (
                <div key={h} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: 'var(--bg2)', borderRadius: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 14 }}>{h}ª ora</span>
                  <button className="btn-ghost" onClick={() => onRestoreHour(h)}
                    style={{ padding: '5px 14px', fontSize: 13 }}>Ripristina</button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'changelog' && (
          <div>
            {clLoading ? (
              <div className="empty-state">Caricamento...</div>
            ) : changelog.length === 0 ? (
              <div className="empty-state">Nessuna modifica registrata.</div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {changelog.map(entry => (
                  <div key={entry.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)',
                    display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)',
                      flexShrink: 0, marginTop: 2 }}>
                      {new Date(entry.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                      {actionLabel(entry.action, entry.details || {})}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TimetablePage({ user, onLogout, theme, onThemeChange, isOnline }) {
  const [settings, setSettings] = useState(null);
  const [slots, setSlots] = useState([]);
  const [notes, setNotes] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [modalInitialTab, setModalInitialTab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [hiddenHours, setHiddenHours] = useState([]);
  const [avatarColor, setAvatarColor] = useState('#2563eb');
  const [shareToken, setShareToken] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [view, setView] = useState('week');
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  // Visibilità orario e stats
  const [timetableHidden, setTimetableHidden] = useState(
    () => localStorage.getItem('timetable_hidden') === '1'
  );
  const [statsHidden, setStatsHidden] = useState(
    () => localStorage.getItem('stats_hidden') === '1'
  );
  const [extraHours, setExtraHours] = useState(
  () => parseInt(localStorage.getItem('extra_hours') || '0')
  );
  const fileInputRef = useRef(null);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const res = await api.get('/timetable/all');
      const { settings: s, slots: sl, notes: n, substitutions: sub } = res.data;
      setSettings(s);
      setIsLocked(s.locked || false);
      setHiddenHours(s.hiddenHours || []);
      setAvatarColor(s.avatarColor || '#2563eb');
      setSlots(sl);
      setNotes(n);
      setSubstitutions(sub);
      localStorage.setItem('timetable_cache', JSON.stringify(res.data));
      api.get('/timetable/share').then(r => setShareToken(r.data.token)).catch(() => {});
    } catch (e) {
      const cached = localStorage.getItem('timetable_cache');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setSettings(data.settings);
          setIsLocked(data.settings.locked || false);
          setHiddenHours(data.settings.hiddenHours || []);
          setAvatarColor(data.settings.avatarColor || '#2563eb');
          setSlots(data.slots);
          setNotes(data.notes);
          setSubstitutions(data.substitutions);
        } catch (_) {}
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') { setSelectedCell(null); setShowSettings(false); }
      if (selectedCell && (e.key === 'n' || e.key === 'N')) setModalInitialTab('notes');
      if (selectedCell && (e.key === 's' || e.key === 'S')) setModalInitialTab('subs');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedCell]);

  const getSlot = (day, hour) => slots.find(s => s.day === day && s.hour === hour);

  const openCell = (day, hour, tab = null) => {
    if (timetableHidden) return;
    const slot = getSlot(day, hour) || { day, hour, subject: '', color: '#2563eb', slot_type: 'subject' };
    setSelectedCell(slot);
    setModalInitialTab(tab);
  };

  const handleSave = async ({ day, hour, subject, color, slot_type }) => {
    await api.post('/timetable/slots', { day, hour, subject, color, slot_type });
    setSlots(prev => {
      const idx = prev.findIndex(s => s.day === day && s.hour === hour);
      const ns = { day, hour, subject, color, slot_type };
      return idx >= 0 ? prev.map((s, i) => i === idx ? ns : s) : [...prev, ns];
    });
  };

  const handleDeleteSlot = async ({ day, hour }) => {
    await api.delete('/timetable/slots', { data: { day, hour } });
    setSlots(prev => prev.filter(s => !(s.day === day && s.hour === hour)));
  };

  const handleSwap = async (from, to) => {
    if (from.day === to.day && from.hour === to.hour) return;
    try {
      await api.post('/timetable/slots/swap', { from, to });
      const res = await api.get('/timetable/slots');
      setSlots(res.data);
    } catch { showToast('Errore nello spostamento', 'err'); }
  };

  const handleAddNote = async (data) => {
    const res = await api.post('/timetable/notes', data);
    setNotes(prev => [...prev, { ...data, id: res.data.id, created_at: new Date().toISOString() }]);
  };

  const handleEditNote = async (id, data) => {
    await api.put(`/timetable/notes/${id}`, data);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
  };

  const handleDeleteNote = async (id) => {
    await api.delete(`/timetable/notes/${id}`);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleAddSub = async (data) => {
    const res = await api.post('/timetable/substitutions', data);
    setSubstitutions(prev => [...prev, { ...data, id: res.data.id }]);
  };

  const handleEditSub = async (id, data) => {
    await api.put(`/timetable/substitutions/${id}`, data);
    setSubstitutions(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const handleDeleteSub = async (id) => {
    await api.delete(`/timetable/substitutions/${id}`);
    setSubstitutions(prev => prev.filter(s => s.id !== id));
  };

  const toggleLock = async () => {
    const nl = !isLocked;
    await api.post('/timetable/settings/lock', { locked: nl });
    setIsLocked(nl);
  };

  const resetSetup = async () => {
    if (!window.confirm('Riconfigurare l\'orario cancellerà tutte le materie. Continuare?')) return;
    await api.post('/timetable/settings/reset');
    window.location.reload();
  };

  const toggleHideHour = async (hour) => {
    const newHidden = hiddenHours.includes(hour) ? hiddenHours.filter(h => h !== hour) : [...hiddenHours, hour];
    setHiddenHours(newHidden);
    await api.post('/timetable/settings/hidden-hours', { hiddenHours: newHidden });
  };

  const handleAvatarColorChange = async (color) => {
    setAvatarColor(color);
    await api.post('/timetable/settings/avatar', { avatarColor: color });
  };

  const toggleTimetableHidden = () => {
    const v = !timetableHidden;
    setTimetableHidden(v);
    localStorage.setItem('timetable_hidden', v ? '1' : '0');
  };

  const toggleStatsHidden = () => {
    const v = !statsHidden;
    setStatsHidden(v);
    localStorage.setItem('stats_hidden', v ? '1' : '0');
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/timetable/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `orario-${new Date().toISOString().split('T')[0]}.json`;
      a.click(); URL.revokeObjectURL(url);
      setShowSettings(false);
    } catch { showToast('Errore export', 'err'); }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.settings || !data.slots) return showToast('File non valido', 'err');
      if (!window.confirm('Importare sovrascriverà tutti i dati. Continuare?')) return;
      await api.post('/timetable/import', data);
      showToast('Importazione completata');
      setShowSettings(false);
      load();
    } catch { showToast('Errore importazione', 'err'); }
    finally { e.target.value = ''; }
  };

  const handleCreateShare = async () => {
    try { const r = await api.post('/timetable/share'); setShareToken(r.data.token); }
    catch { showToast('Errore', 'err'); }
  };

  const handleDeleteShare = async () => {
    if (!window.confirm('Revocare il link?')) return;
    await api.delete('/timetable/share');
    setShareToken(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em' }}>
        CARICAMENTO...
      </span>
    </div>
  );

  const allHours = Array.from({ length: settings?.hoursPerDay || 6 }, (_, i) => i + 1);
  const maxHour = Math.min((settings?.hoursPerDay || 6) + extraHours, 10);
  const allHoursExtended = Array.from({ length: maxHour }, (_, i) => i + 1);
  const hours = allHoursExtended.filter(h => !hiddenHours.includes(h));
  const days = settings?.schoolDays || [];
  const filledSlots = slots.filter(s => s.subject && s.subject.trim() !== '' && s.slot_type !== 'free');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Navbar ── */}
      <header style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '0 16px', height: 'var(--header-h)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em' }}>
            ORARIO
          </span>
          {isLocked && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--warning)',
              background: 'var(--warning-bg)', padding: '2px 6px', borderRadius: 3 }}>
              BLOCCATO
            </span>
          )}
          {!isOnline && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--danger)',
              background: 'var(--danger-bg)', padding: '2px 6px', borderRadius: 3 }}>
              OFFLINE
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Toggle settimana / domani */}
          <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 6,
            border: '1px solid var(--border)', overflow: 'hidden' }}>
            {[{ v: 'week', l: 'Sett.' }, { v: 'today', l: 'Domani' }].map(opt => (
              <button key={opt.v} onClick={() => setView(opt.v)}
                style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 0,
                  background: view === opt.v ? 'var(--primary)' : 'transparent',
                  color: view === opt.v ? 'white' : 'var(--text2)', transition: 'all 0.15s' }}>
                {opt.l}
              </button>
            ))}
          </div>

          {/* Nascondi/mostra orario */}
          <button className="btn-icon" onClick={toggleTimetableHidden}
            title={timetableHidden ? 'Mostra orario' : 'Nascondi orario'}
            style={{ color: timetableHidden ? 'var(--primary)' : 'var(--text2)' }}>
            <EyeIcon closed={timetableHidden} />
          </button>

          {/* Avatar + Impostazioni (ingranaggio) */}
          <button onClick={() => setShowSettings(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 8, padding: '5px 10px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: avatarColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {(user?.username || '?')[0].toUpperCase()}
            </div>
            <span style={{ color: 'var(--text2)' }}><GearIcon /></span>
          </button>
        </div>
      </header>

      {/* ── Stats strip ── */}
      {!statsHidden && (
        <div style={{ borderBottom: '1px solid var(--border)', padding: '7px 16px',
          display: 'flex', gap: 20, background: 'var(--bg2)', overflowX: 'auto',
          alignItems: 'center' }}>
          {[
            { label: 'giorni', value: days.length },
            { label: 'ore', value: filledSlots.length },
            { label: 'materie', value: new Set(filledSlots.map(s => s.subject)).size },
            { label: 'note', value: notes.length },
            { label: 'supplenze', value: substitutions.length },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--primary)' }}>{s.value}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s.label}</span>
            </div>
          ))}
          {/* Pulsante nascondi stats — alla fine */}
          <button onClick={toggleStatsHidden}
            style={{ marginLeft: 'auto', flexShrink: 0, background: 'transparent',
              border: 'none', color: 'var(--text3)', fontSize: 11, cursor: 'pointer',
              fontFamily: 'var(--mono)', padding: '2px 6px' }}>
            nascondi
          </button>
        </div>
      )}

      {/* Bottone per mostrare di nuovo le stats quando sono nascoste */}
      {statsHidden && (
        <div style={{ padding: '4px 16px', background: 'var(--bg2)',
          borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={toggleStatsHidden}
            style={{ background: 'transparent', border: 'none', color: 'var(--text3)',
              fontSize: 11, cursor: 'pointer', fontFamily: 'var(--mono)', padding: '2px 6px' }}>
            mostra statistiche
          </button>
        </div>
      )}

      {/* ── Contenuto ── */}
      {view === 'today' ? (
        <TodayView
          settings={settings}
          slots={slots}
          notes={notes}
          substitutions={substitutions}
          isLocked={isLocked}
          onOpenCell={openCell}
        />
      ) : timetableHidden ? (
        /* Schermata "orario nascosto" */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '50vh', gap: 12, padding: 20 }}>
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>Orario nascosto</div>
          <button className="btn-ghost" onClick={toggleTimetableHidden}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}>
            <EyeIcon closed={false} /> Mostra orario
          </button>
        </div>
      ) : (
        <div style={{ padding: 12, overflowX: 'auto', paddingBottom: 100 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `44px repeat(${days.length}, minmax(90px, 1fr))`,
            gap: 3,
            minWidth: days.length * 93 + 47
          }}>
            {/* Header giorni */}
            <div />
            {days.map(day => (
              <div key={day} style={{ background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                  color: 'var(--text)', letterSpacing: '0.06em' }}>
                  {day.slice(0, 3).toUpperCase()}
                </div>
              </div>
            ))}

            {/* Ore */}
            {hours.map(hour => (
              <>
                <div key={`h${hour}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 4, position: 'relative', minHeight: 44, cursor: 'default' }}
                  onMouseEnter={e => { const b = e.currentTarget.querySelector('.hhb'); if (b) b.style.opacity = '1'; }}
                  onMouseLeave={e => { const b = e.currentTarget.querySelector('.hhb'); if (b) b.style.opacity = '0'; }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
                    {hour}
                  </span>
                  <button className="hhb" onClick={() => toggleHideHour(hour)}
                    title={`Nascondi ora ${hour}`}
                    style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14,
                      fontSize: 10, background: 'var(--bg3)', border: 'none', borderRadius: 2,
                      color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.15s', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                    ×
                  </button>
                </div>

                {days.map(day => {
                  const slot = getSlot(day, hour);
                  const cellNotes = notes.filter(n => n.day === day && n.hour === hour);
                  const cellSubs = substitutions.filter(s =>
                    s.day === day && s.hour <= hour && (s.hour_to || s.hour) >= hour
                  );
                  const isOver = dragOver?.day === day && dragOver?.hour === hour;
                  const isDragging = dragFrom?.day === day && dragFrom?.hour === hour;

                  return (
                    <TimetableCell
                      key={`${day}-${hour}`}
                      day={day} hour={hour}
                      slot={slot}
                      cellNotes={cellNotes}
                      cellSubs={cellSubs}
                      isLocked={isLocked}
                      isDragOver={isOver}
                      isDragging={isDragging}
                      onClick={() => openCell(day, hour)}
                      onDragStart={() => setDragFrom({ day, hour })}
                      onDragOver={() => setDragOver({ day, hour })}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => {
                        if (dragFrom) handleSwap(dragFrom, { day, hour });
                        setDragFrom(null); setDragOver(null);
                      }}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* Controllo ore extra */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 12, marginTop: 12, paddingBottom: 100
      }}>
        {extraHours > 0 && (
          <button
            onClick={() => {
              const v = extraHours - 1;
              setExtraHours(v);
              localStorage.setItem('extra_hours', v);
            }}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '6px 16px', fontSize: 18,
              color: 'var(--text2)', cursor: 'pointer', lineHeight: 1,
              fontFamily: 'var(--mono)'
            }}>
            −
          </button>
        )}

        <span style={{
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)',
          letterSpacing: '0.08em'
        }}>
          {maxHour} ORE
          {extraHours > 0 && (
            <span style={{ color: 'var(--primary)', marginLeft: 6 }}>
              +{extraHours} extra
            </span>
          )}
        </span>

        {maxHour < 10 && (
          <button
            onClick={() => {
              const v = extraHours + 1;
              setExtraHours(v);
              localStorage.setItem('extra_hours', v);
            }}
            style={{
              background: 'var(--primary)', border: 'none',
              borderRadius: 6, padding: '6px 16px', fontSize: 18,
              color: 'white', cursor: 'pointer', lineHeight: 1,
              fontFamily: 'var(--mono)'
            }}>
            +
          </button>
        )}

        {maxHour >= 10 && (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10,
            color: 'var(--text3)', letterSpacing: '0.06em'
          }}>
            MAX 10
          </span>
        )}
      </div>

      <ClockWidget />

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 'calc(var(--header-h) + 8px)', right: 16, zIndex: 300,
          background: toast.type === 'err' ? 'var(--danger-bg)' : 'var(--card)',
          border: `1px solid ${toast.type === 'err' ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 8, padding: '10px 16px', fontSize: 13,
          color: toast.type === 'err' ? 'var(--danger)' : 'var(--success)',
          boxShadow: 'var(--shadow-md)' }}>
          {toast.msg}
        </div>
      )}

      {/* CellModal */}
      {selectedCell && (
        <CellModal
          cell={selectedCell}
          hours={hours}
          isLocked={isLocked}
          notes={notes}
          substitutions={substitutions}
          initialTab={modalInitialTab}
          onClose={() => { setSelectedCell(null); setModalInitialTab(null); }}
          onSave={handleSave}
          onDelete={handleDeleteSlot}
          onAddNote={handleAddNote}
          onEditNote={handleEditNote}
          onDeleteNote={handleDeleteNote}
          onAddSub={handleAddSub}
          onEditSub={handleEditSub}
          onDeleteSub={handleDeleteSub}
        />
      )}

      {/* SettingsPanel */}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onReset={resetSetup}
          onExport={handleExport}
          onImport={handleImportFile}
          isLocked={isLocked}
          onToggleLock={toggleLock}
          theme={theme}
          onThemeChange={onThemeChange}
          fileRef={fileInputRef}
          hiddenHours={hiddenHours}
          onRestoreHour={toggleHideHour}
          avatarColor={avatarColor}
          onAvatarColorChange={handleAvatarColorChange}
          shareToken={shareToken}
          onCreateShare={handleCreateShare}
          onDeleteShare={handleDeleteShare}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}