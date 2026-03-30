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
    <div style={{ padding: '20px 16px', maxWidth: 560, margin: '0 auto', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)',
          letterSpacing: '0.1em', marginBottom: 4 }}>
          DOMANI · {tomorrowDate.toLocaleDateString('it-IT', {
            day: '2-digit', month: 'long', year: 'numeric'
          }).toUpperCase()}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{tomorrowName}</h2>
      </div>

      {/* Banner vacanza */}
      {activeVacation && (
        <div style={{
          background: `${activeVacation.color}15`,
          border: `1px solid ${activeVacation.color}`,
          borderRadius: 10, padding: '16px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ fontSize: 28 }}>🏖️</div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: activeVacation.color,
              letterSpacing: '0.1em', fontWeight: 700, marginBottom: 3 }}>VACANZA IN CORSO</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: activeVacation.color }}>
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
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            Domani non si va a scuola
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            {tomorrowName} non è tra i giorni scolastici.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hours.map(hour => {
            const slot = getSlot(hour);
            const cellNotes = getCellNotes(hour);
            const cellSubs = getCellSubs(hour);
            const isFree = slot?.slot_type === 'free';
            const latestSub = cellSubs[0] || null;
            const hasSub = !!latestSub;
            const isEmpty = !slot?.subject && !isFree;

            return (
              <div
                key={hour}
                onClick={() => onOpenCell(tomorrowName, hour)}
                style={{
                  display: 'grid', gridTemplateColumns: '44px 1fr', gap: 10,
                  cursor: 'pointer', borderRadius: 8, padding: '2px 0',
                  transition: 'opacity 0.1s',
                  opacity: activeVacation ? 0.65 : 1,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = activeVacation ? '0.5' : '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = activeVacation ? '0.65' : '1'}
              >
                {/* Numero ora */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'flex-start', paddingTop: 12 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700,
                    color: 'var(--text2)', lineHeight: 1 }}>
                    {hour}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 3 }}>
                    {hourLabel(hour).split(' – ')[0]}
                  </div>
                </div>

                {/* Card */}
                <div style={{
                  background: 'var(--card)',
                  border: `1px solid ${hasSub ? 'var(--warning)' : isFree ? 'var(--free)' : 'var(--border)'}`,
                  borderLeft: `3px solid ${
                    activeVacation ? activeVacation.color
                    : hasSub ? 'var(--warning)'
                    : isFree ? 'var(--free)'
                    : isEmpty ? 'var(--border)'
                    : (slot?.color || 'var(--border)')
                  }`,
                  borderRadius: 8, padding: '10px 14px',
                  minHeight: 54, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
                }}>
                  {isFree ? (
                    <span style={{ fontSize: 12, color: 'var(--free)', fontWeight: 600,
                      fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}>ORA LIBERA</span>
                  ) : isEmpty ? (
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>
                      {isLocked ? '—' : 'Vuota · tocca per aggiungere'}
                    </span>
                  ) : hasSub ? (
                    <div>
                      {slot?.subject && (
                        <div style={{ fontSize: 11, textDecoration: 'line-through',
                          color: 'var(--text3)', marginBottom: 2 }}>{slot.subject}</div>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--warning)' }}>
                        {latestSub.substitute}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                        Supplenza{latestSub.hour_to && latestSub.hour_to !== latestSub.hour
                          ? ` · ore ${latestSub.hour}–${latestSub.hour_to}` : ''}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {slot.subject}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 1 }}>
                        {hourLabel(hour)}
                      </div>
                    </div>
                  )}

                  {cellNotes.length > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {cellNotes.map(n => (
                        <div key={n.id} style={{
                          fontSize: 12, color: 'var(--text2)', background: 'var(--bg2)',
                          borderRadius: 4, padding: '4px 8px', lineHeight: 1.5
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