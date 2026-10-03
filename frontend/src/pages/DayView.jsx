import { useState, useEffect } from 'react';
import { getContrastText } from '../constants/colors.js';
import { addDays, dayName, toIso, TASK_KINDS, isTask } from '../utils/dates.js';

function hourLabel(h) {
  const startH = 7 + h;
  return `${startH}:00 – ${startH + 1}:00`;
}

// Vista di un singolo giorno: mode='today' (oggi) oppure 'tomorrow' (domani).
export default function DayView({ mode = 'tomorrow', settings, slots, notes, substitutions, vacations = [],
  isLocked, onOpenCell, extraHours = 0, onToggleTask }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const isToday = mode === 'today';
  const date = isToday ? now : addDays(now, 1);
  const name = dayName(date);
  const iso = toIso(date);

  const schoolDays = settings?.schoolDays || [];
  const hoursPerDay = settings?.hoursPerDay || 6;
  const maxHour = Math.min(hoursPerDay + extraHours, 10);
  const hours = Array.from({ length: maxHour }, (_, i) => i + 1);
  const isSchoolDay = schoolDays.includes(name);
  const activeVacation = vacations.find(v => iso >= v.start_date && iso <= v.end_date);
  const nowHour = now.getHours();

  const getSlot = (hour) => slots.find(s => s.day === name && s.hour === hour);
  // Solo ciò che riguarda QUESTA data (o ciò che non ha data).
  const getCellNotes = (hour) => notes
    .filter(n => n.day === name && n.hour === hour && (!n.note_date || n.note_date === iso))
    .sort((a, b) => Number(isTask(b)) - Number(isTask(a)) || new Date(b.created_at) - new Date(a.created_at));
  const getCellSubs = (hour) => substitutions
    .filter(s => s.day === name && s.sub_date === iso && s.hour <= hour && (s.hour_to || s.hour) >= hour);

  const dateLabel = date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div style={{ padding: '24px 16px', maxWidth: 560, margin: '0 auto', paddingBottom: 100 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--primary)',
          letterSpacing: '0.12em', marginBottom: 6, fontWeight: 600 }}>
          {isToday ? 'OGGI' : 'DOMANI'} · {dateLabel}
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.01em' }}>{name}</h2>
      </div>

      {activeVacation && (
        <div style={{
          background: `color-mix(in srgb, ${activeVacation.color} 14%, var(--surface-container-lowest))`,
          borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ fontSize: 28 }}>🏖️</div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: activeVacation.color,
              letterSpacing: '0.1em', fontWeight: 700, marginBottom: 3 }}>VACANZA IN CORSO</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: activeVacation.color }}>{activeVacation.name}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
              fino al {new Date(activeVacation.end_date + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}
            </div>
          </div>
        </div>
      )}

      {!isSchoolDay ? (
        <div style={{ textAlign: 'center', padding: '56px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6, color: 'var(--text)' }}>
            {isToday ? 'Oggi non si va a scuola' : 'Domani non si va a scuola'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>{name} non è tra i giorni scolastici.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hours.map(hour => {
            const slot = getSlot(hour);
            const cellNotes = getCellNotes(hour);
            const latestSub = getCellSubs(hour)[0] || null;
            const hasSub = !!latestSub;
            const isFree = slot?.slot_type === 'free';
            const isEmpty = !slot?.subject && !isFree;
            const isCurrent = isToday && !activeVacation && nowHour === 7 + hour;

            const cardBg = hasSub ? 'var(--warning-container)'
              : isFree ? 'var(--free-container)'
              : isEmpty ? 'var(--surface-container-low)'
              : (slot?.color || 'var(--surface-container)');
            const cardFg = hasSub ? 'var(--on-warning-container)'
              : isFree ? 'var(--on-free-container)'
              : isEmpty ? 'var(--text)'
              : getContrastText(slot?.color);

            return (
              <div key={hour} onClick={() => onOpenCell(name, hour)}
                style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr', gap: 12, cursor: 'pointer',
                  borderRadius: 'var(--radius-lg)', padding: '2px 0', opacity: activeVacation ? 0.6 : 1,
                }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700,
                    color: isCurrent ? 'var(--primary)' : 'var(--text3)', lineHeight: 1 }}>{hour}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>
                    {hourLabel(hour).split(' – ')[0]}
                  </div>
                </div>

                <div style={{
                  background: cardBg, color: cardFg, borderRadius: 'var(--radius-lg)', padding: '12px 16px',
                  minHeight: 56, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
                  position: 'relative', overflow: 'hidden',
                  outline: isCurrent ? '2px solid var(--primary)' : 'none', outlineOffset: -2,
                }}>
                  {isCurrent && (
                    <span style={{ position: 'absolute', top: 8, right: 10, fontFamily: 'var(--mono)', fontSize: 9,
                      fontWeight: 700, letterSpacing: '0.08em', color: 'var(--primary)' }}>● IN CORSO</span>
                  )}
                  {!isEmpty && !isFree && !hasSub && slot?.color && (
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: slot.color }} />
                  )}
                  {isFree ? (
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>ORA LIBERA</span>
                  ) : isEmpty ? (
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>{isLocked ? '—' : 'Vuota · tocca per aggiungere'}</span>
                  ) : hasSub ? (
                    <div style={{ paddingLeft: 4 }}>
                      {slot?.subject && (
                        <div style={{ fontSize: 11, textDecoration: 'line-through', opacity: 0.75, marginBottom: 2 }}>{slot.subject}</div>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{latestSub.substitute}</div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--mono)', marginTop: 2, opacity: 0.85 }}>
                        Supplenza{latestSub.hour_to && latestSub.hour_to !== latestSub.hour ? ` · ore ${latestSub.hour}–${latestSub.hour_to}` : ''}
                      </div>
                    </div>
                  ) : (
                    <div style={{ paddingLeft: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{slot.subject}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 1 }}>{hourLabel(hour)}</div>
                    </div>
                  )}

                  {cellNotes.length > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 4 }}>
                      {cellNotes.map(n => {
                        const task = isTask(n);
                        const kind = n.kind || 'note';
                        return (
                          <div key={n.id} onClick={e => task && e.stopPropagation()} style={{
                            fontSize: 12, lineHeight: 1.5, borderRadius: 'var(--radius-xs)', padding: '5px 8px',
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: task ? `var(--${kind}-container)` : 'var(--surface-container-lowest)',
                            color: task ? `var(--on-${kind}-container)` : 'var(--text2)',
                            opacity: task && n.done ? 0.6 : 1,
                          }}>
                            {task && (
                              <button className={`task-check${n.done ? ' on' : ''}`} title={n.done ? 'Segna come da fare' : 'Segna come fatto'}
                                onClick={() => onToggleTask?.(n.id, !n.done)}>
                                {n.done && <span className="icon" style={{ fontSize: 14 }}>check</span>}
                              </button>
                            )}
                            {task && <span className={`kind-tag ${kind}`}>{TASK_KINDS[kind].short}</span>}
                            <span style={{ flex: 1, textDecoration: task && n.done ? 'line-through' : 'none' }}>{n.content}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
