import { useMemo, useState } from 'react';
import { getContrastText } from '../constants/colors.js';
import { addDays, dayName, fromIso, mondayOf, toIso, todayIso, TASK_KINDS, isTask } from '../utils/dates.js';

const WEEK_ORDER = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

function rangeFor(period, offset) {
  const today = new Date();
  if (period === 'week') {
    const start = addDays(mondayOf(today), offset * 7);
    return { start, dates: Array.from({ length: 7 }, (_, i) => addDays(start, i)),
      label: `${start.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} – ${addDays(start, 6).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}` };
  }
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const label = first.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  return { start: first, dates: Array.from({ length: n }, (_, i) => addDays(first, i)), label: label.charAt(0).toUpperCase() + label.slice(1) };
}

function computeStats(dates, { settings, slots, substitutions, vacations, hiddenHours }) {
  const schoolDays = settings?.schoolDays || [];
  const subjects = new Map(); // nome -> { hours, color }
  const perDay = Object.fromEntries(WEEK_ORDER.map(d => [d, 0]));
  let totalHours = 0, freeHours = 0, schoolDaysCount = 0, vacationDays = 0, subs = 0;

  for (const date of dates) {
    const iso = toIso(date);
    const name = dayName(date);
    if (!schoolDays.includes(name)) continue;
    if (vacations.some(v => iso >= v.start_date && iso <= v.end_date)) { vacationDays++; continue; }
    schoolDaysCount++;
    for (const s of slots) {
      if (s.day !== name || hiddenHours.includes(s.hour)) continue;
      if (s.slot_type === 'free') { freeHours++; continue; }
      if (!s.subject || !s.subject.trim()) continue;
      const key = s.subject.trim();
      const e = subjects.get(key) || { hours: 0, color: s.color };
      e.hours++; subjects.set(key, e);
      totalHours++; perDay[name]++;
    }
    subs += substitutions.filter(x => x.sub_date === iso).length;
  }
  const bySubject = [...subjects.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
  return { bySubject, perDay, totalHours, freeHours, schoolDaysCount, vacationDays, subs };
}

function Card({ label, value, sub }) {
  return (
    <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 600, color: 'var(--primary)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--text3)',
    fontWeight: 600, margin: '28px 0 12px' }}>{children}</div>;
}

export default function StatsPage({ settings, slots, notes, substitutions, vacations = [], hiddenHours = [], onToggleTask }) {
  const [period, setPeriod] = useState('week');
  const [offset, setOffset] = useState(0);
  const [taskFilter, setTaskFilter] = useState('todo');

  const range = useMemo(() => rangeFor(period, offset), [period, offset]);
  const st = useMemo(() => computeStats(range.dates, { settings, slots, substitutions, vacations, hiddenHours }),
    [range, settings, slots, substitutions, vacations, hiddenHours]);

  const maxSubj = Math.max(1, ...st.bySubject.map(s => s.hours));
  const maxDay = Math.max(1, ...Object.values(st.perDay));
  const schoolWeekDays = WEEK_ORDER.filter(d => (settings?.schoolDays || []).includes(d));

  const tasks = notes.filter(isTask);
  const today = todayIso();
  const subjectOf = n => slots.find(s => s.day === n.day && s.hour === n.hour)?.subject || '';
  const byDate = (a, b) => (a.note_date || '9999') .localeCompare(b.note_date || '9999');
  const todo = tasks.filter(n => !n.done).sort(byDate);
  const done = tasks.filter(n => n.done).sort((a, b) => byDate(b, a));
  const overdue = todo.filter(n => n.note_date && n.note_date < today).length;
  const list = taskFilter === 'todo' ? todo : done;

  const seg = (active) => ({
    padding: '6px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 'var(--radius-full)', cursor: 'pointer',
    background: active ? 'var(--surface-container-lowest)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--text2)', boxShadow: active ? 'var(--elevation-1)' : 'none',
  });

  return (
    <div style={{ padding: '20px 16px 120px', maxWidth: 680, margin: '0 auto' }}>
      <h2 style={{ fontSize: 24, fontWeight: 400, marginBottom: 16 }}>Statistiche</h2>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: 'var(--surface-container-highest)', borderRadius: 'var(--radius-full)', padding: 3, gap: 2 }}>
          <button style={seg(period === 'week')} onClick={() => { setPeriod('week'); setOffset(0); }}>Settimana</button>
          <button style={seg(period === 'month')} onClick={() => { setPeriod('month'); setOffset(0); }}>Mese</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="hdr-btn" onClick={() => setOffset(o => o - 1)} title="Precedente"><span className="icon">chevron_left</span></button>
          <button onClick={() => setOffset(0)} disabled={offset === 0}
            style={{ border: 'none', background: 'none', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)',
              minWidth: 130, textAlign: 'center', cursor: offset === 0 ? 'default' : 'pointer' }}>{range.label}</button>
          <button className="hdr-btn" onClick={() => setOffset(o => o + 1)} title="Successivo"><span className="icon">chevron_right</span></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 16 }}>
        <Card label="ore di lezione" value={st.totalHours} sub={st.schoolDaysCount ? `${(st.totalHours / st.schoolDaysCount).toFixed(1)} al giorno` : null} />
        <Card label="materie" value={st.bySubject.length} />
        <Card label="ore libere" value={st.freeHours} />
        <Card label="giorni di scuola" value={st.schoolDaysCount} sub={st.vacationDays ? `${st.vacationDays} di vacanza` : null} />
        <Card label="supplenze" value={st.subs} />
      </div>

      <SectionTitle>ORE PER MATERIA</SectionTitle>
      {st.bySubject.length === 0 ? (
        <div className="empty-state">Nessuna lezione nel periodo selezionato.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {st.bySubject.map(s => (
            <div key={s.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 30%) 1fr 34px', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.name}>{s.name}</div>
              <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-full)', height: 22, overflow: 'hidden' }}>
                <div style={{ width: `${(s.hours / maxSubj) * 100}%`, height: '100%', background: s.color || 'var(--primary)',
                  borderRadius: 'var(--radius-full)', minWidth: 22, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 8, color: getContrastText(s.color), fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                  transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{s.hours}h</div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>ORE PER GIORNO DELLA SETTIMANA</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 }}>
        {schoolWeekDays.map(d => (
          <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600 }}>{st.perDay[d]}</span>
            <div style={{ width: '100%', maxWidth: 44, height: `${(st.perDay[d] / maxDay) * 80}px`, minHeight: 3,
              background: 'var(--primary)', opacity: st.perDay[d] ? 1 : 0.25, borderRadius: '8px 8px 2px 2px', transition: 'height 0.3s' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>{d.slice(0, 3).toUpperCase()}</span>
          </div>
        ))}
      </div>

      <SectionTitle>COMPITI E VERIFICHE</SectionTitle>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--surface-container-highest)', borderRadius: 'var(--radius-full)', padding: 3, gap: 2 }}>
          <button style={seg(taskFilter === 'todo')} onClick={() => setTaskFilter('todo')}>Da fare ({todo.length})</button>
          <button style={seg(taskFilter === 'done')} onClick={() => setTaskFilter('done')}>Fatti ({done.length})</button>
        </div>
        {overdue > 0 && taskFilter === 'todo' && (
          <span className="kind-tag test">{overdue} IN RITARDO</span>
        )}
      </div>
      {list.length === 0 ? (
        <div className="empty-state">{taskFilter === 'todo' ? 'Niente da fare, tutto in regola! 🎉' : 'Ancora nessun compito completato.'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map(n => {
            const late = !n.done && n.note_date && n.note_date < today;
            const subj = subjectOf(n);
            return (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)',
                background: `var(--${n.kind}-container)`, color: `var(--on-${n.kind}-container)`, opacity: n.done ? 0.65 : 1,
              }}>
                <button className={`task-check${n.done ? ' on' : ''}`} onClick={() => onToggleTask(n.id, !n.done)}
                  title={n.done ? 'Segna come da fare' : 'Segna come fatto'}>
                  {n.done && <span className="icon" style={{ fontSize: 14 }}>check</span>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, textDecoration: n.done ? 'line-through' : 'none' }}>{n.content}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.8, marginTop: 2 }}>
                    {TASK_KINDS[n.kind].short}{subj ? ` · ${subj}` : ''}{n.note_date ? ` · ${fromIso(n.note_date).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}` : ''}
                    {late ? ' · IN RITARDO' : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
