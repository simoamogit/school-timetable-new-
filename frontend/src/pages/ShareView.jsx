import { useState, useEffect } from 'react';
import api from '../api/index.js';

export default function ShareView({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedCell, setExpandedCell] = useState(null); // "day-hour"

  useEffect(() => {
    api.get(`/timetable/view/${token}`)
      .then(res => setData(res.data))
      .catch(e => setError(e.response?.data?.error || 'Link non valido o scaduto'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
      color: '#94a3b8', letterSpacing: '0.1em' }}>
      CARICAMENTO...
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', height: '100vh', gap: 12, padding: 20,
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>{error}</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>Il proprietario potrebbe aver revocato l'accesso.</p>
    </div>
  );

  const { username, avatarColor, settings, slots, notes, substitutions } = data;
  const { schoolDays, hoursPerDay } = settings;
  const hours = Array.from({ length: hoursPerDay }, (_, i) => i + 1);

  const getSlot = (day, hour) => slots.find(s => s.day === day && s.hour === hour);
  const getCellNotes = (day, hour) =>
    notes
      .filter(n => n.day === day && n.hour === hour)
      .sort((a, b) => {
        if (a.note_date && b.note_date) return new Date(a.note_date) - new Date(b.note_date);
        if (a.note_date) return -1;
        if (b.note_date) return 1;
        return 0;
      });
  const getCellSubs = (day, hour) =>
    substitutions
      .filter(s => s.day === day && s.hour <= hour && (s.hour_to || s.hour) >= hour)
      .sort((a, b) => new Date(a.sub_date) - new Date(b.sub_date));

  const cellKey = (day, hour) => `${day}-${hour}`;
  const isExpanded = (day, hour) => expandedCell === cellKey(day, hour);
  const toggleExpand = (day, hour) => {
    const k = cellKey(day, hour);
    setExpandedCell(prev => prev === k ? null : k);
  };

  // Conta quante celle hanno note o supplenze (per il totale in header)
  const totalNotes = notes.length;
  const totalSubs = substitutions.length;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc',
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        .cell-btn { transition: opacity 0.1s; cursor: pointer; }
        .cell-btn:hover { opacity: 0.82; }
      `}</style>

      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 20px', height: 52, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%',
            background: avatarColor || '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white' }}>
            {(username || '?')[0].toUpperCase()}
          </div>
          <div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              color: '#64748b', letterSpacing: '0.08em' }}>
              ORARIO DI {username?.toUpperCase()}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {totalNotes > 0 && (
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {totalNotes} note · {totalSubs} supplenze
            </span>
          )}
          <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0',
            borderRadius: 4, padding: '3px 10px', fontSize: 11, color: '#64748b',
            fontFamily: "'IBM Plex Mono', monospace" }}>
            SOLA LETTURA
          </span>
          <a href="/" style={{ fontSize: 12, color: '#2563eb',
            textDecoration: 'none', fontWeight: 500 }}>
            Crea il tuo →
          </a>
        </div>
      </header>

      {/* Hint */}
      <div style={{ background: '#eff6ff', borderBottom: '1px solid #dbeafe',
        padding: '7px 20px', fontSize: 12, color: '#3b82f6', textAlign: 'center' }}>
        Tocca una cella per vedere note e supplenze
      </div>

      {/* Griglia */}
      <div style={{ padding: 12, overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `40px repeat(${schoolDays.length}, minmax(100px, 1fr))`,
          gap: 3,
          minWidth: schoolDays.length * 103 + 43
        }}>
          {/* Header giorni */}
          <div />
          {schoolDays.map(day => (
            <div key={day} style={{ background: 'white', border: '1px solid #e2e8f0',
              borderRadius: 4, padding: '8px 4px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                fontWeight: 600, color: '#0f172a', letterSpacing: '0.08em' }}>
                {day.slice(0, 3).toUpperCase()}
              </div>
            </div>
          ))}

          {/* Ore */}
          {hours.map(hour => (
            <>
              <div key={`h${hour}`} style={{ display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0',
                borderRadius: 4, minHeight: 44 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
                  fontWeight: 600, color: '#94a3b8' }}>{hour}</span>
              </div>

              {schoolDays.map(day => {
                const slot = getSlot(day, hour);
                const cellNotes = getCellNotes(day, hour);
                const cellSubs = getCellSubs(day, hour);
                const latestSub = cellSubs[0] || null;
                const hasSub = !!latestSub;
                const isFree = slot?.slot_type === 'free';
                const isEmpty = !slot?.subject && !isFree;
                const hasExtras = cellNotes.length > 0 || cellSubs.length > 0;
                const expanded = isExpanded(day, hour);

                return (
                  <div key={`${day}-${hour}`}
                    style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                    {/* Cella principale */}
                    <div
                      className="cell-btn"
                      onClick={() => hasExtras && toggleExpand(day, hour)}
                      style={{
                        background: hasSub ? 'rgba(217,119,6,0.08)'
                          : isFree ? 'rgba(13,148,136,0.07)'
                          : isEmpty ? 'white'
                          : slot.color,
                        border: `1px solid ${
                          hasSub ? '#d97706'
                          : isFree ? '#0d9488'
                          : expanded ? '#2563eb'
                          : isEmpty ? '#e2e8f0'
                          : slot.color}`,
                        borderRadius: expanded ? '4px 4px 0 0' : 4,
                        padding: '6px 5px',
                        minHeight: 68,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                        cursor: hasExtras ? 'pointer' : 'default',
                        position: 'relative',
                      }}>
                      {isFree ? (
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 9, color: '#0d9488', fontWeight: 600 }}>LIBERA</span>
                      ) : isEmpty ? (
                        <span style={{ fontSize: 16, color: '#e2e8f0' }}>—</span>
                      ) : hasSub ? (
                        <>
                          {slot?.subject && (
                            <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.35)',
                              textDecoration: 'line-through',
                              fontFamily: "'IBM Plex Mono', monospace",
                              maxWidth: '100%', overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {slot.subject}
                            </span>
                          )}
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706',
                            textAlign: 'center', lineHeight: 1.2, maxWidth: '100%',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', padding: '0 3px' }}>
                            {latestSub.substitute}
                          </span>
                          <span style={{ fontSize: 9, color: '#92400e',
                            fontFamily: "'IBM Plex Mono', monospace" }}>
                            {new Date(latestSub.sub_date).toLocaleDateString('it-IT',
                              { day: '2-digit', month: '2-digit' })}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'white',
                          textAlign: 'center', lineHeight: 1.2,
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          maxWidth: '100%', overflow: 'hidden',
                          textOverflow: 'ellipsis', padding: '0 4px' }}>
                          {slot.subject}
                        </span>
                      )}

                      {/* Badge note/supplenze */}
                      {hasExtras && (
                        <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                          {cellNotes.length > 0 && (
                            <span style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: 9, fontWeight: 600,
                              background: isFree || isEmpty ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.22)',
                              borderRadius: 3, padding: '1px 4px',
                              color: isFree || isEmpty ? '#64748b' : 'white'
                            }}>
                              {cellNotes.length}n
                            </span>
                          )}
                          {cellSubs.length > 0 && !hasSub && (
                            <span style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: 9, fontWeight: 600,
                              background: 'rgba(217,119,6,0.15)',
                              borderRadius: 3, padding: '1px 4px', color: '#d97706'
                            }}>
                              {cellSubs.length}s
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pannello espanso con note e supplenze */}
                    {expanded && (
                      <div style={{
                        border: '1px solid #2563eb',
                        borderTop: 'none',
                        borderRadius: '0 0 6px 6px',
                        background: 'white',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}>

                        {/* Note */}
                        {cellNotes.length > 0 && (
                          <div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: 9, color: '#94a3b8', letterSpacing: '0.08em',
                              marginBottom: 6, fontWeight: 600 }}>
                              NOTE
                            </div>
                            {cellNotes.map((n, i) => (
                              <div key={n.id} style={{
                                fontSize: 12, color: '#0f172a', lineHeight: 1.5,
                                paddingTop: i > 0 ? 6 : 0,
                                marginTop: i > 0 ? 6 : 0,
                                borderTop: i > 0 ? '1px solid #f1f5f9' : 'none'
                              }}>
                                {n.note_date && (
                                  <div style={{ fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>
                                    {new Date(n.note_date).toLocaleDateString('it-IT',
                                      { weekday: 'short', day: '2-digit', month: 'short' })}
                                  </div>
                                )}
                                {n.content}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Supplenze */}
                        {cellSubs.length > 0 && (
                          <div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: 9, color: '#d97706', letterSpacing: '0.08em',
                              marginBottom: 6, fontWeight: 600 }}>
                              SUPPLENZE
                            </div>
                            {cellSubs.map((s, i) => (
                              <div key={s.id} style={{
                                fontSize: 12, lineHeight: 1.5,
                                paddingTop: i > 0 ? 6 : 0,
                                marginTop: i > 0 ? 6 : 0,
                                borderTop: i > 0 ? '1px solid #f1f5f9' : 'none'
                              }}>
                                <div style={{ fontWeight: 600, color: '#d97706' }}>
                                  {s.substitute}
                                </div>
                                <div style={{ fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                                  {new Date(s.sub_date).toLocaleDateString('it-IT',
                                    { weekday: 'short', day: '2-digit', month: 'long' })}
                                  {s.hour_to && s.hour_to !== s.hour
                                    ? ` · ore ${s.hour}–${s.hour_to}`
                                    : ` · ora ${s.hour}`}
                                </div>
                                {s.note && (
                                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                    {s.note}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 16,
          borderTop: '1px solid #e2e8f0', color: '#94a3b8', fontSize: 12 }}>
          Condiviso con{' '}
          <a href="/" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Orario Scolastico
          </a>
          {' '}· Sola lettura
        </div>
      </div>
    </div>
  );
}