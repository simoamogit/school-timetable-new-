import { useMemo } from 'react';
import { addDays, fromIso, toIso, todayIso, TASK_KINDS, isTask } from '../utils/dates.js';

function whenLabel(iso) {
  if (!iso) return null;
  const diff = Math.round((fromIso(iso) - fromIso(todayIso())) / 86400000);
  const when = diff === 0 ? 'OGGI' : diff === 1 ? 'DOMANI' : diff === -1 ? 'IERI' : diff > 1 ? `TRA ${diff} GIORNI` : `${-diff} GIORNI FA`;
  return { when, diff };
}

const dateText = iso => fromIso(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

// Vista ingrandita di tutto ciò che riguarda una cella (o una cella in una data precisa):
// supplenze, verifiche, compiti e note, con testo grande e leggibile a colpo d'occhio.
export default function DetailsModal({ day, hour, iso = null, slots, notes, substitutions, onClose, onToggleTask, onEdit }) {
  const slot = slots.find(s => s.day === day && s.hour === hour);
  const title = slot?.slot_type === 'free' ? 'Ora libera' : slot?.subject || 'Cella vuota';

  const { subs, tasks, plain, done } = useMemo(() => {
    const byDate = (a, b) => (a.note_date || '9999').localeCompare(b.note_date || '9999');
    const cellNotes = notes.filter(n => n.day === day && n.hour === hour && (!iso || !n.note_date || n.note_date === iso));
    return {
      subs: substitutions
        .filter(s => s.day === day && s.hour <= hour && (s.hour_to || s.hour) >= hour && (!iso || s.sub_date === iso))
        .sort((a, b) => a.sub_date.localeCompare(b.sub_date)),
      tasks: cellNotes.filter(n => isTask(n) && !n.done)
        .sort((a, b) => byDate(a, b) || (a.kind === 'test' ? -1 : 1)),
      plain: cellNotes.filter(n => !isTask(n)).sort(byDate),
      done: cellNotes.filter(n => isTask(n) && n.done).sort(byDate),
    };
  }, [notes, substitutions, day, hour, iso]);

  const empty = !subs.length && !tasks.length && !plain.length && !done.length;
  const sectionLabel = (t) => (
    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--text3)',
      fontWeight: 600, margin: '22px 0 10px' }}>{t}</div>
  );

  const taskRow = (n) => {
    const w = whenLabel(n.note_date);
    const late = !n.done && w && w.diff < 0;
    return (
      <div key={n.id} style={{
        display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 18px', marginBottom: 10,
        borderRadius: 'var(--radius-lg)', background: `var(--${n.kind}-container)`, color: `var(--on-${n.kind}-container)`,
        opacity: n.done ? 0.6 : 1,
      }}>
        <button className={`task-check${n.done ? ' on' : ''}`} onClick={() => onToggleTask?.(n.id, !n.done)}
          style={{ width: 28, height: 28, minWidth: 28, minHeight: 28, marginTop: 2 }}
          title={n.done ? 'Segna come da fare' : 'Segna come fatto'}>
          {n.done && <span className="icon" style={{ fontSize: 20 }}>check</span>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
            <span className={`kind-tag ${n.kind}`} style={{ fontSize: 11, padding: '3px 8px', border: '1px solid currentColor' }}>
              {TASK_KINDS[n.kind].short}
            </span>
            {w && !n.done && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>
                {late ? `⚠ IN RITARDO · ${w.when}` : w.when}
              </span>
            )}
          </div>
          <div style={{ fontSize: 20, lineHeight: 1.35, fontWeight: 500, wordBreak: 'break-word',
            textDecoration: n.done ? 'line-through' : 'none' }}>{n.content}</div>
          {n.note_date && (
            <div style={{ fontSize: 14, marginTop: 6, opacity: 0.85, textTransform: 'capitalize' }}>{dateText(n.note_date)}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Dettaglio ingrandito"
        style={{ maxHeight: '92dvh', overflowY: 'auto', maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 6 }}>
              {day.toUpperCase()} · ORA {hour}{iso ? ` · ${fromIso(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }).toUpperCase()}` : ''}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.15 }}>{title}</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Chiudi"><span className="icon">close</span></button>
        </div>

        {empty && <div className="empty-state" style={{ fontSize: 16, marginTop: 24 }}>Nessuna nota, compito, verifica o supplenza.</div>}

        {subs.length > 0 && <>
          {sectionLabel('SUPPLENZE')}
          {subs.map(s => (
            <div key={s.id} style={{ padding: '16px 18px', marginBottom: 10, borderRadius: 'var(--radius-lg)',
              background: 'var(--warning-container)', color: 'var(--on-warning-container)' }}>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, wordBreak: 'break-word' }}>{s.substitute}</div>
              <div style={{ fontSize: 14, marginTop: 6, opacity: 0.9 }}>
                <span style={{ textTransform: 'capitalize' }}>{dateText(s.sub_date)}</span>
                {s.hour_to && s.hour_to !== s.hour ? ` · ore ${s.hour}–${s.hour_to}` : ` · ora ${s.hour}`}
              </div>
              {s.note && <div style={{ fontSize: 17, marginTop: 8, lineHeight: 1.4 }}>{s.note}</div>}
            </div>
          ))}
        </>}

        {tasks.length > 0 && <>{sectionLabel('DA FARE')}{tasks.map(taskRow)}</>}

        {plain.length > 0 && <>
          {sectionLabel('NOTE')}
          {plain.map(n => (
            <div key={n.id} style={{ padding: '16px 18px', marginBottom: 10, borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-container-lowest)', color: 'var(--text)' }}>
              <div style={{ fontSize: 20, lineHeight: 1.35, wordBreak: 'break-word' }}>{n.content}</div>
              {n.note_date && <div style={{ fontSize: 14, marginTop: 6, color: 'var(--text3)', textTransform: 'capitalize' }}>{dateText(n.note_date)}</div>}
            </div>
          ))}
        </>}

        {done.length > 0 && <>{sectionLabel('COMPLETATI')}{done.map(taskRow)}</>}

        {onEdit && (
          <button className="btn-tonal" onClick={onEdit} style={{ width: '100%', padding: 12, marginTop: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="icon" style={{ fontSize: 18 }}>edit</span> Modifica la cella
          </button>
        )}
      </div>
    </div>
  );
}
