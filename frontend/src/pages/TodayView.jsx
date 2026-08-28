// frontend/src/pages/TodayView.jsx
import { useState, useEffect } from 'react';

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

function getTomorrowName(date) {
  const name = date.toLocaleDateString('it-IT', { weekday: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function hourLabel(h) {
  const startH = 7 + h;
  return `${startH}:00 – ${startH + 1}:00`;
}

export default function TodayView({ settings, slots, notes, substitutions, vacations = [], isLocked, onOpenCell, extraHours = 0 }) {
  const [tomorrowDate, setTomorrowDate] = useState(getTomorrowDate);
  const [tomorrowName, setTomorrowName] = useState(() => getTomorrowName(getTomorrowDate()));

  useEffect(() => {
    const t = setInterval(() => {
      const d = getTomorrowDate();
      setTomorrowDate(d);
      setTomorrowName(getTomorrowName(d));
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const schoolDays = settings?.schoolDays || [];
  const hoursPerDay = settings?.hoursPerDay || 6;
  const maxHour = Math.min(hoursPerDay + extraHours, 10);
  const hours = Array.from({ length: maxHour }, (_, i) => i + 1);
  const isSchoolDay = schoolDays.includes(tomorrowName);
  const tomorrowIso = tomorrowDate.toISOString().split('T')[0];

  // Check for vacation
  const activeVacation = vacations.find(v =>
    tomorrowIso >= v.start_date && tomorrowIso <= v.end_date
  );

  const getSlot = (hour) => slots.find(s => s.day === tomorrowName && s.hour === hour);
  const getCellNotes = (hour) => {
    const arr = notes.filter(n => n.day === tomorrowName && n.hour === hour);
    return arr.sort((a, b) => {
      if (a.note_date && b.note_date) return new Date(a.note_date) - new Date(b.note_date);
      if (a.note_date) return -1;
      if (b.note_date) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  };
  const getCellSubs = (hour) => {
    const arr = substitutions.filter(s =>
      s.day === tomorrowName && s.hour <= hour && (s.hour_to || s.hour) >= hour
    );
    return arr.sort((a, b) => new Date(a.sub_date) - new Date(b.sub_date));
  };

  return (
    <div style={{ padding: '24px 16px', maxWidth: 560, margin: '0 auto', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--primary)',
          letterSpacing: '0.12em', marginBottom: 6, fontWeight: 600 }}>
          DOMANI · {tomorrowDate.toLocaleDateString('it-IT', {
            day: '2-digit', month: 'long', year: 'numeric'
          }).toUpperCase()}
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.01em' }}>{tomorrowName}</h2>
      </div>

      {/* Banner vacanza */}
      {activeVacation && (
        <div style={{
          background: `color-mix(in srgb, ${activeVacation.color} 14%, var(--surface-container-lowest))`,
          border: 'none',
          borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ fontSize: 28 }}>🏖️</div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: activeVacation.color,
              letterSpacing: '0.1em', fontWeight: 700, marginBottom: 3 }}>VACANZA IN CORSO</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: activeVacation.color }}>
              {activeVacation.name}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
              fino al {new Date(activeVacation.end_date).toLocaleDateString('it-IT', {
                day: '2-digit', month: 'long'
              })}
            </div>
          </div>
        </div>
      )}

      {!isSchoolDay ? (
        <div style={{ textAlign: 'center', padding: '56px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6, color: 'var(--text)' }}>
            Domani non si va a scuola
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            {tomorrowName} non è tra i giorni scolastici.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hours.map(hour => {
            const slot = getSlot(hour);
            const cellNotes = getCellNotes(hour);
            const cellSubs = getCellSubs(hour);
            const isFree = slot?.slot_type === 'free';
            const latestSub = cellSubs[0] || null;
            const hasSub = !!latestSub;
            const isEmpty = !slot?.subject && !isFree;

            // Superficie tonale della card in base allo stato (M3: tono, non bordo netto).
            // Le materie usano il colore pastello scelto per lo slot come sfondo pieno:
            // essendo tutti toni chiari, il testo scuro resta sempre leggibile sopra.
            const cardBg = hasSub ? 'var(--warning-container)'
              : isFree ? 'var(--free-container)'
              : isEmpty ? 'var(--surface-container-low)'
              : (slot?.color || 'var(--surface-container)');
            const cardFg = hasSub ? 'var(--on-warning-container)'
              : isFree ? 'var(--on-free-container)'
              : 'var(--text)';

            return (
              <div
                key={hour}
                onClick={() => onOpenCell(tomorrowName, hour)}
                style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr', gap: 12,
                  cursor: 'pointer', borderRadius: 'var(--radius-lg)', padding: '2px 0',
                  transition: 'opacity 0.1s',
                  opacity: activeVacation ? 0.6 : 1,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = activeVacation ? '0.45' : '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = activeVacation ? '0.6' : '1'}
              >
                {/* Numero ora */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'flex-start', paddingTop: 14 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700,
                    color: 'var(--text3)', lineHeight: 1 }}>
                    {hour}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>
                    {hourLabel(hour).split(' – ')[0]}
                  </div>
                </div>

                {/* Card */}
                <div style={{
                  background: cardBg,
                  color: cardFg,
                  borderRadius: 'var(--radius-lg)', padding: '12px 16px',
                  minHeight: 56, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
                  position: 'relative', overflow: 'hidden',
                }}>
                  {!isEmpty && !isFree && !hasSub && slot?.color && (
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: slot.color }} />
                  )}
                  {isFree ? (
                    <span style={{ fontSize: 12, fontWeight: 700,
                      fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>ORA LIBERA</span>
                  ) : isEmpty ? (
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>
                      {isLocked ? '—' : 'Vuota · tocca per aggiungere'}
                    </span>
                  ) : hasSub ? (
                    <div style={{ paddingLeft: 4 }}>
                      {slot?.subject && (
                        <div style={{ fontSize: 11, textDecoration: 'line-through',
                          opacity: 0.75, marginBottom: 2 }}>{slot.subject}</div>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        {latestSub.substitute}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--mono)', marginTop: 2, opacity: 0.85 }}>
                        Supplenza{latestSub.hour_to && latestSub.hour_to !== latestSub.hour
                          ? ` · ore ${latestSub.hour}–${latestSub.hour_to}` : ''}
                      </div>
                    </div>
                  ) : (
                    <div style={{ paddingLeft: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {slot.subject}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 1 }}>
                        {hourLabel(hour)}
                      </div>
                    </div>
                  )}

                  {cellNotes.length > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 4 }}>
                      {cellNotes.map(n => (
                        <div key={n.id} style={{
                          fontSize: 12, color: 'var(--text2)', background: 'var(--surface-container-lowest)',
                          borderRadius: 'var(--radius-xs)', padding: '4px 8px', lineHeight: 1.5
                        }}>
                          {n.note_date && (
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 10,
                              color: 'var(--text3)', marginRight: 6 }}>
                              {new Date(n.note_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                          {n.content}
                        </div>
                      ))}
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