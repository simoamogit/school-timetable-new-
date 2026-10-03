const express = require('express');
const { pool } = require('../db/database');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

// Tutte le funzioni data qui sotto lavorano SEMPRE sui componenti locali
// (anno/mese/giorno), mai su toISOString()/new Date(isoString): per lo
// stesso motivo del bug del date picker, passare da UTC sfaserebbe il
// giorno per chi gira su un fuso avanti rispetto a UTC (es. server su
// Render in UTC, utenti in Italia).
function dayNameFromIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// "Oggi" calcolato nel fuso di Roma, non in quello (spesso UTC) del server:
// altrimenti a ridosso della mezzanotte l'API potrebbe restituire il giorno
// sbagliato per gli utenti italiani.
function todayIsoRome() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

// Queste rotte NON usano il JWT (la dashboard esterna non ha una sessione), ma
// non sono più aperte a chiunque: richiedono il token di condivisione
// dell'utente (lo stesso del link /share/<token>, generato dalle Impostazioni
// dell'app), passato come ?token=... oppure nell'header X-Share-Token.
// Revocando il link di condivisione si revoca anche l'accesso della dashboard.
async function resolveUserId(req) {
  const token = String(req.query.token || req.get('x-share-token') || '');
  if (!/^[a-f0-9]{16,64}$/.test(token)) return null;
  const r = await pool.query('SELECT user_id FROM share_tokens WHERE token=$1', [token]);
  return r.rows[0]?.user_id || null;
}

async function loadContext(userId) {
  const [sR, slR, subR, nR, vacR] = await Promise.all([
    pool.query('SELECT school_days, hours_per_day, hidden_hours FROM user_settings WHERE user_id=$1', [userId]),
    pool.query('SELECT day, hour, subject, slot_type FROM slots WHERE user_id=$1', [userId]),
    pool.query('SELECT day, hour, hour_to, substitute, sub_date, note FROM substitutions WHERE user_id=$1', [userId]),
    pool.query('SELECT day, hour, content, note_date, kind, done FROM notes WHERE user_id=$1', [userId]),
    pool.query('SELECT name, start_date, end_date FROM vacations WHERE user_id=$1', [userId]),
  ]);
  const s = sR.rows[0] || {};
  return {
    schoolDays: JSON.parse(s.school_days || '[]'),
    hoursPerDay: s.hours_per_day || 6,
    hiddenHours: JSON.parse(s.hidden_hours || '[]'),
    slots: slR.rows,
    substitutions: subR.rows,
    notes: nR.rows,
    vacations: vacR.rows,
  };
}

// Costruisce il payload di un singolo giorno reale, combinando l'orario
// ricorrente (giorno-della-settimana) con supplenze/note legate a quella
// data specifica.
function buildDay(dateIso, ctx) {
  const dayName = dayNameFromIso(dateIso);
  const vacation = ctx.vacations.find(v => dateIso >= v.start_date && dateIso <= v.end_date);
  const isSchoolDay = ctx.schoolDays.includes(dayName);
  const isHoliday = !!vacation || !isSchoolDay;

  if (isHoliday) {
    return {
      date: dateIso,
      day_name: dayName,
      is_holiday: true,
      holiday_name: vacation ? vacation.name : 'Fine settimana',
      exit_time: null,
      events: [],
    };
  }

  const hours = Array.from({ length: ctx.hoursPerDay }, (_, i) => i + 1)
    .filter(h => !ctx.hiddenHours.includes(h));

  const events = [];
  for (const h of hours) {
    const sub = ctx.substitutions.find(s =>
      s.day === dayName && s.sub_date === dateIso && s.hour <= h && (s.hour_to || s.hour) >= h
    );
    const slot = ctx.slots.find(s => s.day === dayName && s.hour === h);

    if (sub) {
      events.push({
        hour: h,
        type: 'substitution',
        subject: slot?.subject ? `${slot.subject} (Supplenza)` : 'Supplenza',
        room: null,
        teacher: sub.substitute,
        note: sub.note || null,
      });
      continue;
    }

    if (!slot || (!slot.subject && slot.slot_type !== 'free')) continue; // cella vuota: nessun evento fittizio

    if (slot.slot_type === 'free') {
      events.push({ hour: h, type: 'free_period', subject: 'Ora libera', room: null, teacher: null, note: null });
      continue;
    }

    const dayNotes = ctx.notes.filter(n => n.day === dayName && n.hour === h && n.note_date === dateIso);
    const note = dayNotes.find(n => (n.kind || 'note') === 'note');
    const tasks = dayNotes.filter(n => (n.kind || 'note') !== 'note')
      .map(n => ({ kind: n.kind, content: n.content, done: !!n.done }));
    events.push({
      hour: h,
      type: note ? 'note' : 'lesson',
      subject: slot.subject,
      room: null,
      teacher: null,
      note: note ? note.content : null,
      tasks, // compiti e verifiche per questa ora (kind: 'homework' | 'test')
    });
  }

  const lastHour = hours.length ? Math.max(...hours) : 0;
  // Stessa convenzione oraria usata dal frontend (TodayView.jsx: 7 + ora):
  // se in futuro l'app gestirà orari reali per materia, questo andrà
  // sostituito con l'ora di fine dell'ultima lezione effettiva.
  const exit_time = lastHour ? `${String(7 + lastHour + 1).padStart(2, '0')}:00` : null;

  return { date: dateIso, day_name: dayName, is_holiday: false, holiday_name: null, exit_time, events };
}

// GET /api/schedule/today — pubblica, nessun login richiesto
router.get('/today', rateLimit({ max: 60 }), async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return res.status(404).json({ error: 'Utente non trovato' });

    const dateIso = todayIsoRome();
    const ctx = await loadContext(userId);
    const day = buildDay(dateIso, ctx);

    if (day.is_holiday) {
      // Comodità extra per la dashboard: indica anche il prossimo giorno
      // scolastico utile, oltre all'informazione "oggi è vacanza/weekend".
      let next = addDays(dateIso, 1);
      for (let i = 0; i < 60; i++) {
        const nd = buildDay(next, ctx);
        if (!nd.is_holiday) { day.next_school_day = next; break; }
        next = addDays(next, 1);
      }
    }

    res.json(day);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/schedule/week — pubblica, settimana corrente Lunedì-Domenica
router.get('/week', rateLimit({ max: 60 }), async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return res.status(404).json({ error: 'Utente non trovato' });

    const todayIso = todayIsoRome();
    const [y, m, d] = todayIso.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay(); // 0 = Domenica
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = addDays(todayIso, mondayOffset);

    const ctx = await loadContext(userId);
    const days = Array.from({ length: 7 }, (_, i) => buildDay(addDays(monday, i), ctx));

    res.json({ week_start: monday, days });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;