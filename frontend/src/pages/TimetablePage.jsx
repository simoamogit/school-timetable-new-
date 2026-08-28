import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/index.js';
import TodayView from './TodayView.jsx';
import DatePicker from '../components/DatePicker.jsx';
import LoadingIndicator from '../components/LoadingIndicator.jsx';
import TextField from '../components/TextField.jsx';
import { useSnackbar } from '../components/SnackbarProvider.jsx';
import { useConfirm } from '../components/ConfirmProvider.jsx';
import { SUBJECT_COLORS, VACATION_COLORS } from '../constants/colors.js';

function getWeekDates() {
  const today = new Date();
  const dow = today.getDay();
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);

  const dateToString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    'Lunedì': dateToString(monday),
    'Martedì': dateToString(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1)),
    'Mercoledì': dateToString(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2)),
    'Giovedì': dateToString(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3)),
    'Venerdì': dateToString(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4)),
    'Sabato': dateToString(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 5)),
    'Domenica': dateToString(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)),
  };
}

// ─── Icona Material Symbols ─────────────────────────────────────────────────
function Icon({ name, size = 20, filled = false, style }) {
  return <span className={`icon${filled ? ' filled' : ''}`} style={{ fontSize: size, ...style }}>{name}</span>;
}

// ─── Clock ────────────────────────────────────────────────────────────────────
function ClockWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      position: 'fixed', bottom: 'var(--space-200)', right: 'var(--space-200)', zIndex: 30,
      background: 'var(--surface-container)', borderRadius: 'var(--radius-md)',
      padding: '8px 14px', textAlign: 'right', boxShadow: 'var(--elevation-1)'
    }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 600,
        color: 'var(--text)', letterSpacing: '0.04em'
      }}>
        {now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)',
        marginTop: 2, letterSpacing: '0.04em'
      }}>
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
        style={{
          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
          background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-xs)', padding: '1px 5px',
          color: 'white', cursor: 'default', userSelect: 'none'
        }}>
        {notes.length}n
      </span>
      {visible && rect && createPortal(
        <div style={{
          position: 'fixed',
          left: Math.min(Math.max(rect.left + rect.width / 2, 130), window.innerWidth - 130),
          ...(rect.top > 180 ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
          transform: 'translateX(-50%)',
          background: 'var(--surface-container-high)', borderRadius: 'var(--radius-md)',
          padding: '10px 12px', width: 240, zIndex: 9999,
          boxShadow: 'var(--elevation-3)', pointerEvents: 'none'
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--mono)'
          }}>
            Note
          </div>
          {notes.map((n, i) => (
            <div key={n.id} style={{
              fontSize: 12, color: 'var(--text)', lineHeight: 1.5,
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              paddingTop: i > 0 ? 8 : 0, marginTop: i > 0 ? 8 : 0
            }}>
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
  vacation, onClick, onDragStart, onDragOver, onDragLeave, onDrop }) {
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
        background: hasSub ? 'var(--warning-container)' : isFree ? 'var(--free-container)' : isEmpty ? 'var(--surface-container-low)' : slot.color,
        border: isEmpty ? '1px dashed var(--outline-variant)' : 'none',
        borderRadius: 'var(--radius-md)', padding: '6px 4px', cursor: 'pointer', minHeight: 72,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3, position: 'relative', transition: `opacity var(--motion-effects-fast), transform var(--motion-spatial-fast)`, userSelect: 'none',
        opacity: vacation ? 0.6 : 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = vacation ? '0.6' : '1'; }}
    >
      {isFree && !hasSub ? (
        <span style={{
          fontSize: 9, color: 'var(--on-free-container)', fontFamily: 'var(--mono)',
          fontWeight: 700, letterSpacing: '0.05em'
        }}>LIBERA</span>
      ) : isEmpty && !hasSub ? (
        <Icon name={isLocked ? 'lock' : 'add'} size={16} style={{ color: 'var(--outline)' }} />
      ) : hasSub ? (
        <>
          {slot?.subject && (
            <span style={{
              fontSize: 9, color: 'var(--on-warning-container)', opacity: 0.7, textDecoration: 'line-through',
              maxWidth: '100%', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--mono)'
            }}>
              {slot.subject}
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--on-warning-container)', textAlign: 'center',
            lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', padding: '0 3px'
          }}>
            {latestSub.substitute}
          </span>
          <span style={{ fontSize: 9, color: 'var(--on-warning-container)', opacity: 0.7, fontFamily: 'var(--mono)' }}>
            {new Date(latestSub.sub_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
          </span>
          {cellNotes.length > 0 && <div onClick={e => e.stopPropagation()}><NoteTooltip notes={cellNotes} /></div>}
        </>
      ) : (
        <>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, textAlign: 'center',
            maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px',
          }}>
            {slot.subject}
          </span>
          {cellNotes.length > 0 && <div onClick={e => e.stopPropagation()}><NoteTooltip notes={cellNotes} /></div>}
        </>
      )}

      {vacation && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `color-mix(in srgb, ${vacation.color} 6%, transparent)`,
          borderRadius: 'var(--radius-md)', pointerEvents: 'none',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: 3,
        }}>
          <span style={{
            fontSize: 7, fontFamily: 'var(--mono)', color: vacation.color,
            fontWeight: 700, letterSpacing: '0.04em', opacity: 0.9
          }}>
            {vacation.name.slice(0, 8).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

function VacationModal({ onClose, onSave, existing }) {
  const [name, setName] = useState(existing?.name || '');
  const [startDate, setStartDate] = useState(existing?.start_date || '');
  const [endDate, setEndDate] = useState(existing?.end_date || '');
  const [color, setColor] = useState(existing?.color || VACATION_COLORS[0]);

  const save = () => {
    if (!name.trim() || !startDate || !endDate) return;
    if (endDate < startDate) return;
    onSave({ name: name.trim(), start_date: startDate, end_date: endDate, color });
  };

  const nights = startDate && endDate
    ? Math.max(0, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
    : 0;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-200)' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 4 }}>
              {existing ? 'MODIFICA' : 'NUOVA'} VACANZA
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 400 }}>{existing ? existing.name : 'Aggiungi vacanza'}</h2>
          </div>
          <button onClick={onClose} className="btn-icon"><Icon name="close" /></button>
        </div>

        <TextField label="Nome vacanza" placeholder="es. Natale, Pasqua, Estate..." value={name}
          onChange={e => setName(e.target.value)} autoFocus
          onKeyDown={e => e.key === 'Enter' && save()} style={{ marginBottom: 'var(--space-200)' }} />

        <div className="form-row" style={{ marginBottom: 'var(--space-150)' }}>
          <div>
            <label className="label">Dal</label>
            <DatePicker value={startDate} onChange={setStartDate} />
          </div>
          <div>
            <label className="label">Al</label>
            <DatePicker value={endDate} onChange={setEndDate} min={startDate} />
          </div>
        </div>

        {nights > 0 && (
          <div style={{
            background: 'var(--secondary-container)', color: 'var(--on-secondary-container)',
            borderRadius: 'var(--radius-md)', padding: '8px 12px',
            marginBottom: 'var(--space-150)', fontSize: 12, fontFamily: 'var(--mono)'
          }}>
            {nights} {nights === 1 ? 'giorno' : 'giorni'} di vacanza
          </div>
        )}

        <div className="form-group">
          <label className="label">Colore</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {VACATION_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 32, height: 32, borderRadius: '50%', background: c, padding: 0, border: 'none',
                outline: color === c ? '2px solid var(--text)' : 'none', outlineOffset: 2,
              }} />
            ))}
          </div>
        </div>

        {name && (
          <div style={{
            background: `color-mix(in srgb, ${color} 18%, var(--surface-container-lowest))`,
            borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 'var(--space-200)',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{name}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1, padding: 12 }}>Annulla</button>
          <button className="btn-primary" onClick={save}
            disabled={!name.trim() || !startDate || !endDate || endDate < startDate}
            style={{ flex: 2, padding: 12 }}>
            {existing ? 'Salva modifiche' : 'Aggiungi vacanza'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CellModal ────────────────────────────────────────────────────────────────
function CellModal({ cell, hours, isLocked, notes, substitutions, initialTab,
  onClose, onSave, onDelete, onAddNote, onEditNote, onDeleteNote, onAddSub, onEditSub, onDeleteSub }) {
  const confirmDialog = useConfirm();

  const [tab, setTab] = useState(initialTab || (isLocked ? 'notes' : 'edit'));
  const [subject, setSubject] = useState(cell.subject || '');
  const [color, setColor] = useState(cell.color || SUBJECT_COLORS[0]);
  const [slotType, setSlotType] = useState(cell.slot_type || 'subject');

  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [editNoteDate, setEditNoteDate] = useState('');

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

  const deleteSlot = async () => {
    const ok = await confirmDialog(`Eliminare "${cell.subject}" da ${cell.day} ora ${cell.hour}?`, { danger: true, confirmLabel: 'Elimina' });
    if (!ok) return;
    onDelete({ day: cell.day, hour: cell.hour });
    onClose();
  };

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
    ...(isLocked ? [] : [{ id: 'edit', label: 'Materia', icon: 'edit' }]),
    { id: 'notes', label: `Note${cellNotes.length ? ` (${cellNotes.length})` : ''}`, icon: 'sticky_note_2' },
    { id: 'subs', label: `Supplenze${cellSubs.length ? ` (${cellSubs.length})` : ''}`, icon: 'swap_horiz' }
  ];

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-200)' }}>
          <div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)',
              letterSpacing: '0.1em', marginBottom: 4
            }}>
              {cell.day.toUpperCase()} · ORA {cell.hour}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 400 }}>
              {slotType === 'free' ? 'Ora libera' : cell.subject || 'Cella vuota'}
            </h2>
            {isLocked && <span style={{ fontSize: 11, color: 'var(--warning)', fontFamily: 'var(--mono)' }}>BLOCCATO</span>}
          </div>
          <button onClick={onClose} className="btn-icon"><Icon name="close" /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 240 }}>
          {tab === 'edit' && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-200)' }}>
                {[{ v: 'subject', l: 'Materia' }, { v: 'free', l: 'Ora libera' }].map(opt => (
                  <button key={opt.v} onClick={() => setSlotType(opt.v)} className={opt.v === slotType ? 'btn-tonal' : 'btn-ghost'}
                    style={{ flex: 1, padding: 10, fontSize: 13 }}>
                    {opt.l}
                  </button>
                ))}
              </div>

              {slotType === 'subject' && (
                <>
                  <TextField label="Nome materia" placeholder="es. Matematica" value={subject}
                    onChange={e => setSubject(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveSlot()} autoFocus style={{ marginBottom: 'var(--space-200)' }} />
                  <div className="form-group">
                    <label className="label">Colore</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      {SUBJECT_COLORS.map(c => (
                        <button key={c} onClick={() => setColor(c)} style={{
                          width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: c, padding: 0,
                          border: color === c ? '2px solid var(--text)' : '2px solid transparent',
                        }} />
                      ))}
                    </div>
                  </div>
                  <div style={{
                    background: color, padding: '10px 14px', marginBottom: 'var(--space-200)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{subject || 'Anteprima'}</span>
                  </div>
                </>
              )}

              {slotType === 'free' && (
                <div style={{
                  background: 'var(--free-container)', borderRadius: 'var(--radius-md)',
                  padding: '12px 16px', marginBottom: 'var(--space-200)', color: 'var(--on-free-container)', fontSize: 13
                }}>
                  Mostrata come buco / ora libera nella tabella.
                </div>
              )}

              {cell.subject && (
                <button onClick={deleteSlot} className="btn-danger" style={{ width: '100%', marginBottom: 10 }}>
                  Svuota cella
                </button>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost" onClick={onClose} style={{ flex: 1, padding: 12 }}>Annulla</button>
                <button className="btn-primary" onClick={saveSlot} style={{ flex: 2, padding: 12 }}>Salva</button>
              </div>
            </div>
          )}

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
                <DatePicker value={noteDate} onChange={setNoteDate} placeholder="Nessuna scadenza" />
              </div>
              <button className="btn-primary" onClick={addNote} disabled={!noteContent.trim()}
                style={{ width: '100%', marginBottom: 'var(--space-200)', padding: 12 }}>
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
                        <DatePicker value={editNoteDate} onChange={setEditNoteDate} placeholder="Nessuna scadenza" />
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
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
                            <Icon name="edit" size={16} />
                          </button>
                          <button className="btn-icon" onClick={() => onDeleteNote(n.id)}
                            style={{ color: 'var(--danger)', minWidth: 32, minHeight: 32 }}>
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          )}

          {tab === 'subs' && (
            <div>
              <TextField label="Supplente / materia alternativa" placeholder="es. Prof. Rossi" value={subText}
                onChange={e => setSubText(e.target.value)} autoFocus style={{ marginBottom: 'var(--space-150)' }} />
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
                <DatePicker value={subDate} onChange={setSubDate} />
              </div>
              <TextField label="Nota (opzionale)" placeholder="Dettagli..." value={subNote}
                onChange={e => setSubNote(e.target.value)} style={{ marginBottom: 'var(--space-150)' }} />
              <button className="btn-primary" onClick={addSub} disabled={!subText.trim() || !subDate}
                style={{ width: '100%', marginBottom: 'var(--space-200)', padding: 12 }}>
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
                          <DatePicker value={editSub.sub_date} onChange={d => setEditSub(p => ({ ...p, sub_date: d }))} />
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
                            <Icon name="edit" size={16} />
                          </button>
                          <button className="btn-icon" onClick={() => onDeleteSub(s.id)}
                            style={{ color: 'var(--danger)', minWidth: 32, minHeight: 32 }}>
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          )}
        </div>

        <div style={{ margin: '12px -20px -20px', padding: '8px 12px calc(8px + env(safe-area-inset-bottom,0px))', borderTop: '1px solid var(--outline-variant)' }}>
          <div className="bottom-nav" style={{ boxShadow: 'none', background: 'transparent' }}>
            {tabs.map(t => (
              <button key={t.id} className={`bottom-nav-item${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
                <span className="bottom-nav-pill"><Icon name={t.icon} size={20} /></span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────
function SettingsPanel({ onClose, onReset, onExport, onImport, isLocked, onToggleLock,
  theme, onThemeChange, fileRef, hiddenHours, onRestoreHour, avatarColor, onAvatarColorChange,
  shareToken, onCreateShare, onDeleteShare, onLogout,
  vacations, onAddVacation, onEditVacation, onDeleteVacation }) {
  const confirmDialog = useConfirm();
  const showSnackbar = useSnackbar();

  const [tab, setTab] = useState('general');
  const [changelog, setChangelog] = useState([]);
  const [clLoading, setClLoading] = useState(false);

  const loadChangelog = async () => {
    setClLoading(true);
    try { const r = await api.get('/timetable/changelog'); setChangelog(r.data); }
    catch (_) { }
    finally { setClLoading(false); }
  };

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : null;

  const copyShare = () => {
    navigator.clipboard.writeText(shareUrl);
    showSnackbar('Link copiato negli appunti');
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
      case 'timetable_reset': return 'Orario riconfigurato: tutte le materie sono state cancellate';
      default: return action;
    }
  };

  const [editingVac, setEditingVac] = useState(null);
  const [vacFilter, setVacFilter] = useState('upcoming');

  const settingsTabs = [
    { id: 'general', label: 'Generale', icon: 'tune' },
    { id: 'vacations', label: 'Vacanze', icon: 'beach_access' },
    { id: 'share', label: 'Link', icon: 'link' },
    { id: 'hours', label: 'Ore', icon: 'schedule' },
    { id: 'changelog', label: 'Log', icon: 'history' },
  ];

  const deleteVacation = async (vac) => {
    const ok = await confirmDialog(`Eliminare "${vac.name}"?`, { danger: true, confirmLabel: 'Elimina' });
    if (ok) onDeleteVacation(vac.id);
  };

  const reset = async () => {
    const ok = await confirmDialog('Riconfigurare l\'orario cancellerà tutte le materie. L\'azione non è reversibile.',
      { title: 'Riconfigurare orario?', danger: true, confirmLabel: 'Riconfigura' });
    if (ok) onReset();
  };

  const deleteShare = async () => {
    const ok = await confirmDialog('Chiunque abbia il link salvato non potrà più vedere il tuo orario.',
      { title: 'Revocare il link?', danger: true, confirmLabel: 'Revoca' });
    if (ok) onDeleteShare();
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-200)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 400 }}>Impostazioni</h2>
          <button onClick={onClose} className="btn-icon"><Icon name="close" /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 280 }}>
          {tab === 'general' && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0 var(--space-200)',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', background: avatarColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)'
                }}>
                  {(localStorage.getItem('username') || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Colore avatar</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {SUBJECT_COLORS.map(c => (
                      <button key={c} onClick={() => onAvatarColorChange(c)} style={{
                        width: 22, height: 22, borderRadius: '50%', background: c, padding: 0,
                        border: avatarColor === c ? '2px solid var(--text)' : '2px solid transparent'
                      }} />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-150)', marginBottom: 'var(--space-200)' }}>
                <div className="setting-box">
                  <div className="icon-circle"><Icon name={theme === 'dark' ? 'dark_mode' : 'light_mode'} size={20} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Tema scuro</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Modalità scura</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={theme === 'dark'}
                        onChange={e => onThemeChange(e.target.checked ? 'dark' : 'light')} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
                <div className="setting-box">
                  <div className="icon-circle"><Icon name={isLocked ? 'lock' : 'lock_open'} size={20} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Blocca orario</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Solo note e suppl.</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={isLocked} onChange={onToggleLock} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={onExport} className="btn-ghost" style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 10, padding: 12 }}>
                  <Icon name="download" size={18} /> Esporta dati (.json)
                </button>
                <button onClick={() => fileRef.current?.click()} className="btn-ghost" style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 10, padding: 12 }}>
                  <Icon name="upload_file" size={18} /> Importa dati (.json)
                </button>
                <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onImport} />
                <button onClick={reset} className="btn-danger" style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon name="restart_alt" size={18} /> Riconfigura orario
                </button>
                <button onClick={onLogout} className="btn-ghost" style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 10, padding: 12, color: 'var(--text2)' }}>
                  <Icon name="logout" size={18} /> Esci dall'account
                </button>
              </div>
            </div>
          )}

          {tab === 'share' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 'var(--space-200)', lineHeight: 1.6 }}>
                Link sola lettura — chiunque ce l'abbia può vedere il tuo orario senza account.
              </p>
              {!shareToken ? (
                <button className="btn-primary" onClick={onCreateShare} style={{ width: '100%', padding: 12 }}>
                  Genera link
                </button>
              ) : (
                <div>
                  <div style={{
                    background: 'var(--surface-container-low)',
                    borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: 10,
                    fontFamily: 'var(--mono)', fontSize: 11, wordBreak: 'break-all', color: 'var(--text2)'
                  }}>
                    {shareUrl}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" onClick={copyShare} style={{ flex: 2, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Icon name="content_copy" size={16} /> Copia link
                    </button>
                    <button className="btn-danger" onClick={deleteShare} style={{ flex: 1, padding: 12 }}>Revoca</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'hours' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 'var(--space-200)' }}>
                Ore nascoste dalla tabella.
              </p>
              {hiddenHours.length === 0 ? (
                <div className="empty-state">Nessuna ora nascosta.<br />Hover sul numero ora → clicca ×</div>
              ) : (
                hiddenHours.sort((a, b) => a - b).map(h => (
                  <div key={h} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', marginBottom: 6
                  }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 14 }}>{h}ª ora</span>
                    <button className="btn-ghost" onClick={() => onRestoreHour(h)}
                      style={{ padding: '5px 14px', fontSize: 13 }}>Ripristina</button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'vacations' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-200)' }}>
                <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                  Periodi visibili nella griglia settimanale.
                </p>
                <button className="btn-tonal" onClick={() => setEditingVac('new')}
                  style={{ padding: '8px 14px', fontSize: 13, flexShrink: 0 }}>
                  + Aggiungi
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-150)' }}>
                {[['upcoming', 'Prossime'], ['all', 'Tutte']].map(([v, l]) => (
                  <button key={v} onClick={() => setVacFilter(v)} className={`chip${vacFilter === v ? ' selected' : ''}`}>
                    {l}
                  </button>
                ))}
              </div>

              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const filtered = vacFilter === 'upcoming'
                  ? vacations.filter(v => v.end_date >= today)
                  : vacations;
                const sorted = [...filtered].sort((a, b) => a.start_date.localeCompare(b.start_date));

                if (sorted.length === 0) return (
                  <div className="empty-state">
                    {vacFilter === 'upcoming' ? 'Nessuna vacanza in arrivo.' : 'Nessuna vacanza salvata.'}
                    <br />
                    <button onClick={() => setEditingVac('new')}
                      style={{
                        marginTop: 8, background: 'none', border: 'none', color: 'var(--primary)',
                        cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)'
                      }}>
                      + Aggiungi la prima
                    </button>
                  </div>
                );

                return sorted.map(vac => {
                  const isPast = vac.end_date < today;
                  const isActive = vac.start_date <= today && vac.end_date >= today;
                  const nights = Math.round((new Date(vac.end_date) - new Date(vac.start_date)) / 86400000) + 1;
                  return (
                    <div key={vac.id} style={{
                      background: `color-mix(in srgb, ${vac.color} 12%, var(--surface-container-lowest))`,
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px', marginBottom: 8,
                      opacity: isPast ? 0.55 : 1,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{vac.name}</span>
                            {isActive && (
                              <span style={{
                                fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                                background: vac.color, color: 'var(--surface)', borderRadius: 'var(--radius-xs)',
                                padding: '1px 5px'
                              }}>IN CORSO</span>
                            )}
                            {isPast && (
                              <span style={{
                                fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)',
                                background: 'var(--surface-container-high)', borderRadius: 'var(--radius-xs)', padding: '1px 5px'
                              }}>PASSATA</span>
                            )}
                          </div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
                            {new Date(vac.start_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                            {' → '}
                            {new Date(vac.end_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' · '}
                            {nights} {nights === 1 ? 'giorno' : 'giorni'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-edit" onClick={() => setEditingVac(vac)} title="Modifica">
                            <Icon name="edit" size={16} />
                          </button>
                          <button className="btn-icon" onClick={() => deleteVacation(vac)}
                            style={{ color: 'var(--danger)', minWidth: 32, minHeight: 32 }}>
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}

              {editingVac && (
                <VacationModal
                  existing={editingVac === 'new' ? null : editingVac}
                  onClose={() => setEditingVac(null)}
                  onSave={async (data) => {
                    if (editingVac === 'new') await onAddVacation(data);
                    else await onEditVacation(editingVac.id, data);
                    setEditingVac(null);
                  }}
                />
              )}
            </div>
          )}

          {tab === 'changelog' && (
            <div>
              {clLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><LoadingIndicator size={28} /></div>
              ) : changelog.length === 0 ? (
                <div className="empty-state">Nessuna modifica registrata.</div>
              ) : (
                <div>
                  {changelog.map(entry => (
                    <div key={entry.id} style={{
                      padding: '10px 0', borderBottom: '1px solid var(--border)',
                      display: 'flex', gap: 12, alignItems: 'flex-start'
                    }}>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)',
                        flexShrink: 0, marginTop: 2
                      }}>
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

        <div style={{ margin: '12px -20px -20px', padding: '8px 12px calc(8px + env(safe-area-inset-bottom,0px))', borderTop: '1px solid var(--outline-variant)' }}>
          <div className="bottom-nav" style={{ boxShadow: 'none', background: 'transparent' }}>
            {settingsTabs.map(t => (
              <button key={t.id} className={`bottom-nav-item${tab === t.id ? ' active' : ''}`}
                onClick={() => { setTab(t.id); if (t.id === 'changelog') loadChangelog(); }}>
                <span className="bottom-nav-pill"><Icon name={t.icon} size={20} /></span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TimetablePage({ user, onLogout, theme, onThemeChange, isOnline }) {
  const showSnackbar = useSnackbar();
  const confirmDialog = useConfirm();

  const [settings, setSettings] = useState(null);
  const [slots, setSlots] = useState([]);
  const [notes, setNotes] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [modalInitialTab, setModalInitialTab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [hiddenHours, setHiddenHours] = useState([]);
  const [avatarColor, setAvatarColor] = useState(SUBJECT_COLORS[0]);
  const [shareToken, setShareToken] = useState(null);
  const [vacations, setVacations] = useState([]);
  const weekDates = useMemo(() => getWeekDates(), []);
  const getVacationForDay = useCallback((dayName) => {
    const date = weekDates[dayName];
    if (!date) return null;
    return vacations.find(v => date >= v.start_date && date <= v.end_date) || null;
  }, [vacations, weekDates]);
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState('week');
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [timetableHidden, setTimetableHidden] = useState(
    () => localStorage.getItem('timetable_hidden') === '1'
  );
  const [statsHidden, setStatsHidden] = useState(
    () => localStorage.getItem('stats_hidden') === '1'
  );
  const [extraHours, setExtraHours] = useState(
    () => parseInt(localStorage.getItem('extra_hours') || '0')
  );
  const [fabOpen, setFabOpen] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/timetable/all');
      const { settings: s, slots: sl, notes: n, substitutions: sub, vacations: vac } = res.data;
      setSettings(s);
      setIsLocked(s.locked || false);
      setHiddenHours(s.hiddenHours || []);
      setAvatarColor(s.avatarColor || SUBJECT_COLORS[0]);
      setSlots(sl);
      setNotes(n);
      setSubstitutions(sub);
      setVacations(vac || []);
      localStorage.setItem('timetable_cache', JSON.stringify(res.data));
      api.get('/timetable/share').then(r => setShareToken(r.data.token)).catch(() => { });
    } catch (e) {
      const cached = localStorage.getItem('timetable_cache');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setSettings(data.settings);
          setIsLocked(data.settings.locked || false);
          setHiddenHours(data.settings.hiddenHours || []);
          setAvatarColor(data.settings.avatarColor || SUBJECT_COLORS[0]);
          setSlots(data.slots);
          setNotes(data.notes);
          setSubstitutions(data.substitutions);
        } catch (_) { }
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') { setSelectedCell(null); setShowSettings(false); setFabOpen(false); }
      if (selectedCell && (e.key === 'n' || e.key === 'N')) setModalInitialTab('notes');
      if (selectedCell && (e.key === 's' || e.key === 'S')) setModalInitialTab('subs');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedCell]);

  const getSlot = (day, hour) => slots.find(s => s.day === day && s.hour === hour);

  const openCell = (day, hour, tab = null) => {
    if (timetableHidden) return;
    const slot = getSlot(day, hour) || { day, hour, subject: '', color: SUBJECT_COLORS[0], slot_type: 'subject' };
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
    showSnackbar('Materia eliminata');
  };

  const handleSwap = async (from, to) => {
    if (from.day === to.day && from.hour === to.hour) return;
    try {
      await api.post('/timetable/slots/swap', { from, to });
      const res = await api.get('/timetable/slots');
      setSlots(res.data);
    } catch { showSnackbar('Errore nello spostamento'); }
  };

  const handleAddNote = async (data) => {
    const res = await api.post('/timetable/notes', data);
    setNotes(prev => [...prev, { ...data, id: res.data.id, created_at: new Date().toISOString() }]);
    showSnackbar('Nota aggiunta');
  };

  const handleEditNote = async (id, data) => {
    await api.put(`/timetable/notes/${id}`, data);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
  };

  const handleDeleteNote = async (id) => {
    await api.delete(`/timetable/notes/${id}`);
    setNotes(prev => prev.filter(n => n.id !== id));
    showSnackbar('Nota eliminata');
  };

  const handleAddSub = async (data) => {
    const res = await api.post('/timetable/substitutions', data);
    setSubstitutions(prev => [...prev, { ...data, id: res.data.id }]);
    showSnackbar('Supplenza aggiunta');
  };

  const handleEditSub = async (id, data) => {
    await api.put(`/timetable/substitutions/${id}`, data);
    setSubstitutions(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const handleDeleteSub = async (id) => {
    await api.delete(`/timetable/substitutions/${id}`);
    setSubstitutions(prev => prev.filter(s => s.id !== id));
    showSnackbar('Supplenza eliminata');
  };

  const handleAddVacation = async (data) => {
    try {
      const res = await api.post('/timetable/vacations', data);
      setVacations(prev => [...prev, { ...data, id: res.data.id }]);
      showSnackbar('Vacanza aggiunta');
    } catch { showSnackbar('Errore'); }
  };

  const handleEditVacation = async (id, data) => {
    try {
      await api.put(`/timetable/vacations/${id}`, data);
      setVacations(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
      showSnackbar('Vacanza aggiornata');
    } catch { showSnackbar('Errore'); }
  };

  const handleDeleteVacation = async (id) => {
    try {
      await api.delete(`/timetable/vacations/${id}`);
      setVacations(prev => prev.filter(v => v.id !== id));
      showSnackbar('Vacanza eliminata');
    } catch { showSnackbar('Errore'); }
  };

  const toggleLock = async () => {
    const nl = !isLocked;
    await api.post('/timetable/settings/lock', { locked: nl });
    setIsLocked(nl);
  };

  const resetSetup = async () => {
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
    } catch { showSnackbar('Errore export'); }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.settings || !data.slots) return showSnackbar('File non valido');
      const ok = await confirmDialog('Importare sovrascriverà tutti i dati attuali. L\'azione non è reversibile.',
        { title: 'Importare dati?', danger: true, confirmLabel: 'Importa' });
      if (!ok) return;
      await api.post('/timetable/import', data);
      showSnackbar('Importazione completata');
      setShowSettings(false);
      load();
    } catch { showSnackbar('Errore importazione'); }
    finally { e.target.value = ''; }
  };

  const handleCreateShare = async () => {
    try { const r = await api.post('/timetable/share'); setShareToken(r.data.token); }
    catch { showSnackbar('Errore'); }
  };

  const handleDeleteShare = async () => {
    await api.delete('/timetable/share');
    setShareToken(null);
    showSnackbar('Link revocato');
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <LoadingIndicator size={48} contained />
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

  const addExtraHour = () => { const v = extraHours + 1; setExtraHours(v); localStorage.setItem('extra_hours', v); setFabOpen(false); };
  const removeExtraHour = () => { const v = extraHours - 1; setExtraHours(v); localStorage.setItem('extra_hours', v); setFabOpen(false); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Navbar ── */}
      <header style={{
        background: 'var(--surface-container)', borderBottom: '1px solid var(--border)',
        padding: '0 var(--space-200)', height: 'var(--header-h)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em' }}>
            ORARIO
          </span>
          {isLocked && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--on-warning-container)',
              background: 'var(--warning-container)', padding: '2px 6px', borderRadius: 'var(--radius-xs)'
            }}>
              BLOCCATO
            </span>
          )}
          {!isOnline && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--on-error-container)',
              background: 'var(--error-container)', padding: '2px 6px', borderRadius: 'var(--radius-xs)'
            }}>
              OFFLINE
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{
            display: 'flex', background: 'var(--surface-container-highest)', borderRadius: 'var(--radius-full)',
            padding: 3, gap: 2,
          }}>
            {[{ v: 'week', l: 'Sett.' }, { v: 'today', l: 'Domani' }].map(opt => (
              <button key={opt.v} onClick={() => setView(opt.v)}
                style={{
                  padding: '5px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 'var(--radius-full)',
                  background: view === opt.v ? 'var(--surface-container-lowest)' : 'transparent',
                  color: view === opt.v ? 'var(--primary)' : 'var(--text2)',
                  transition: `background-color var(--motion-spatial-fast), color var(--motion-effects-fast)`,
                  boxShadow: view === opt.v ? 'var(--elevation-1)' : 'none',
                }}>
                {opt.l}
              </button>
            ))}
          </div>

          <button className="btn-icon" onClick={toggleTimetableHidden}
            title={timetableHidden ? 'Mostra orario' : 'Nascondi orario'}
            style={{ color: timetableHidden ? 'var(--primary)' : 'var(--text2)' }}>
            <Icon name={timetableHidden ? 'visibility_off' : 'visibility'} />
          </button>

          <button onClick={() => setShowSettings(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface-container-highest)', border: 'none',
              borderRadius: 'var(--radius-full)', padding: '4px 10px 4px 4px', cursor: 'pointer'
            }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: avatarColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'var(--text)', flexShrink: 0
            }}>
              {(user?.username || '?')[0].toUpperCase()}
            </div>
            <Icon name="settings" size={18} style={{ color: 'var(--text2)' }} />
          </button>
        </div>
      </header>

      {!statsHidden && (
        <div style={{
          borderBottom: '1px solid var(--border)', padding: '7px var(--space-200)',
          display: 'flex', gap: 20, background: 'var(--surface-container-low)', overflowX: 'auto',
          alignItems: 'center'
        }}>
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
          <button onClick={toggleStatsHidden}
            style={{
              marginLeft: 'auto', flexShrink: 0, background: 'transparent',
              border: 'none', color: 'var(--text3)', fontSize: 11, cursor: 'pointer',
              fontFamily: 'var(--mono)', padding: '2px 6px'
            }}>
            nascondi
          </button>
        </div>
      )}

      {statsHidden && (
        <div style={{
          padding: '4px var(--space-200)', background: 'var(--surface-container-low)',
          borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end'
        }}>
          <button onClick={toggleStatsHidden}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text3)',
              fontSize: 11, cursor: 'pointer', fontFamily: 'var(--mono)', padding: '2px 6px'
            }}>
            mostra statistiche
          </button>
        </div>
      )}

      {view === 'today' ? (
        <TodayView
          settings={settings}
          slots={slots}
          notes={notes}
          substitutions={substitutions}
          vacations={vacations}
          isLocked={isLocked}
          onOpenCell={openCell}
          extraHours={extraHours}
        />
      ) : timetableHidden ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '50vh', gap: 12, padding: 20
        }}>
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>Orario nascosto</div>
          <button className="btn-ghost" onClick={toggleTimetableHidden}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}>
            <Icon name="visibility" size={18} /> Mostra orario
          </button>
        </div>
      ) : (
        <div style={{ padding: 12, overflowX: 'auto', paddingBottom: 120 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `44px repeat(${days.length}, minmax(90px, 1fr))`,
            gap: 4,
            minWidth: days.length * 93 + 47
          }}>
            <div />
            {days.map(day => {
              const vac = getVacationForDay(day);
              const dayDate = weekDates[day];
              return (
                <div key={day} style={{
                  background: vac ? `color-mix(in srgb, ${vac.color} 16%, var(--surface-container-lowest))` : 'var(--surface-container-low)',
                  borderRadius: 'var(--radius-md)', padding: '6px 4px', textAlign: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {vac && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: vac.color,
                    }} />
                  )}
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                    color: vac ? vac.color : 'var(--text)', letterSpacing: '0.06em'
                  }}>
                    {day.slice(0, 3).toUpperCase()}
                  </div>
                  {dayDate && (
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 8, color: vac ? vac.color : 'var(--text3)',
                      marginTop: 1, opacity: 0.7
                    }}>
                      {new Date(dayDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                  {vac && (
                    <div style={{
                      fontSize: 8, fontWeight: 700, color: vac.color, marginTop: 1,
                      fontFamily: 'var(--mono)', letterSpacing: '0.03em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px'
                    }}>
                      🏖️ {vac.name}
                    </div>
                  )}
                </div>
              );
            })}

            {hours.map(hour => (
              <>
                <div key={`h${hour}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--surface-container-low)',
                    borderRadius: 'var(--radius-md)', position: 'relative', minHeight: 44, cursor: 'default'
                  }}
                  onMouseEnter={e => { const b = e.currentTarget.querySelector('.hhb'); if (b) b.style.opacity = '1'; }}
                  onMouseLeave={e => { const b = e.currentTarget.querySelector('.hhb'); if (b) b.style.opacity = '0'; }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
                    {hour}
                  </span>
                  <button className="hhb" onClick={() => toggleHideHour(hour)}
                    title={`Nascondi ora ${hour}`}
                    style={{
                      position: 'absolute', top: 2, right: 2, width: 16, height: 16, minWidth: 0, minHeight: 0,
                      fontSize: 10, background: 'var(--surface-container-highest)', border: 'none', borderRadius: '50%',
                      color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity var(--motion-effects-fast)', cursor: 'pointer', padding: 0, lineHeight: 1
                    }}>
                    <Icon name="close" size={11} />
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
                      vacation={getVacationForDay(day)}
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

      <ClockWidget />

      {fabOpen && <div className="fab-scrim" onClick={() => setFabOpen(false)} />}
      {fabOpen && (
        <div className="fab-menu">
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)',
            background: 'var(--surface-container-high)', borderRadius: 'var(--radius-full)',
            padding: '4px 12px', boxShadow: 'var(--elevation-1)', animation: 'fab-item-in var(--motion-spatial-fast) both'
          }}>
            {maxHour} ORE {extraHours > 0 && `(+${extraHours} extra)`}
          </div>
          {maxHour < 10 && (
            <button className="fab-menu-item" onClick={addExtraHour}>
              <span className="icon-circle"><Icon name="add" size={18} /></span>
              Aggiungi ora
            </button>
          )}
          {extraHours > 0 && (
            <button className="fab-menu-item" onClick={removeExtraHour}>
              <span className="icon-circle"><Icon name="remove" size={18} /></span>
              Rimuovi ora extra
            </button>
          )}
        </div>
      )}
      <button className={`fab${fabOpen ? ' open' : ''}`} onClick={() => setFabOpen(o => !o)} title="Gestisci ore">
        <Icon name="add" size={26} />
      </button>

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
          vacations={vacations}
          onAddVacation={handleAddVacation}
          onEditVacation={handleEditVacation}
          onDeleteVacation={handleDeleteVacation}
        />
      )}
    </div>
  );
}