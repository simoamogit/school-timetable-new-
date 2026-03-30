const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// --- Helper: log ---
async function logChange(userId, action, details) {
  try {
    await pool.query(
      'INSERT INTO change_log (user_id, action, details) VALUES ($1, $2, $3)',
      [userId, action, JSON.stringify(details)]
    );
  } catch (_) {}
}

// --- Helper: cleanup scaduti ---
async function cleanupExpired(userId) {
  const today = new Date().toISOString().split('T')[0];
  await pool.query(`DELETE FROM notes WHERE user_id=$1 AND note_date IS NOT NULL AND note_date < $2`, [userId, today]);
  await pool.query(`DELETE FROM substitutions WHERE user_id=$1 AND sub_date < $2`, [userId, today]);
}

// =====================
// ROTTE PUBBLICHE (nessuna auth)
// =====================

router.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// =====================
// ROTTE PROTETTE
// =====================
router.use(auth);

// --- TUTTO IN UNO ---
router.get('/all', async (req, res) => {
  try {
    await cleanupExpired(req.user.id);
    const [sR, slR, nR, subR, vacR] = await Promise.all([
      pool.query('SELECT * FROM user_settings WHERE user_id=$1', [req.user.id]),
      pool.query('SELECT * FROM slots WHERE user_id=$1', [req.user.id]),
      pool.query('SELECT * FROM notes WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]),
      pool.query('SELECT * FROM substitutions WHERE user_id=$1 ORDER BY sub_date DESC', [req.user.id]),
      pool.query('SELECT * FROM vacations WHERE user_id=$1 ORDER BY start_date', [req.user.id])
    ]);
    const s = sR.rows[0];
    res.json({
      settings: {
        setupComplete: s?.setup_complete === 1,
        schoolDays: JSON.parse(s?.school_days || '[]'),
        hoursPerDay: s?.hours_per_day || 6,
        locked: s?.locked === 1,
        theme: s?.theme || 'dark',
        avatarColor: s?.avatar_color || '#2563eb',
        hiddenHours: JSON.parse(s?.hidden_hours || '[]'),
      },
      slots: slR.rows,
      notes: nR.rows,
      substitutions: subR.rows,
      vacations: vacR.rows
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Errore server' }); }
});

// --- SETTINGS ---
router.get('/settings', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM user_settings WHERE user_id=$1', [req.user.id]);
    const s = r.rows[0];
    if (!s) return res.json({ setupComplete: false });
    res.json({
      setupComplete: s.setup_complete === 1,
      schoolDays: JSON.parse(s.school_days),
      hoursPerDay: s.hours_per_day,
      locked: s.locked === 1,
      theme: s.theme || 'dark',
      avatarColor: s.avatar_color || '#2563eb',
      hiddenHours: JSON.parse(s.hidden_hours || '[]'),
    });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/settings', async (req, res) => {
  const { schoolDays, hoursPerDay } = req.body;
  if (!schoolDays || !hoursPerDay) return res.status(400).json({ error: 'Dati mancanti' });
  try {
    await pool.query(
      `UPDATE user_settings SET school_days=$1, hours_per_day=$2, setup_complete=1 WHERE user_id=$3`,
      [JSON.stringify(schoolDays), hoursPerDay, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/settings/reset', async (req, res) => {
  try {
    await pool.query(`UPDATE user_settings SET setup_complete=0, school_days='[]', hours_per_day=6 WHERE user_id=$1`, [req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/settings/lock', async (req, res) => {
  const { locked } = req.body;
  try {
    await pool.query(`UPDATE user_settings SET locked=$1 WHERE user_id=$2`, [locked ? 1 : 0, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/settings/theme', async (req, res) => {
  const { theme } = req.body;
  try {
    await pool.query(`UPDATE user_settings SET theme=$1 WHERE user_id=$2`, [theme, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/settings/hidden-hours', async (req, res) => {
  const { hiddenHours } = req.body;
  try {
    await pool.query(`UPDATE user_settings SET hidden_hours=$1 WHERE user_id=$2`, [JSON.stringify(hiddenHours), req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/settings/avatar', async (req, res) => {
  const { avatarColor } = req.body;
  try {
    await pool.query(`UPDATE user_settings SET avatar_color=$1 WHERE user_id=$2`, [avatarColor, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

// --- SLOTS ---
router.get('/slots', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM slots WHERE user_id=$1', [req.user.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/slots', async (req, res) => {
  const { day, hour, subject, color, slot_type } = req.body;
  try {
    const old = await pool.query('SELECT * FROM slots WHERE user_id=$1 AND day=$2 AND hour=$3', [req.user.id, day, hour]);
    await pool.query(
      `INSERT INTO slots (user_id, day, hour, subject, color, slot_type) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, day, hour) DO UPDATE SET subject=EXCLUDED.subject, color=EXCLUDED.color, slot_type=EXCLUDED.slot_type`,
      [req.user.id, day, hour, subject || '', color || '#2563eb', slot_type || 'subject']
    );
    const oldRow = old.rows[0];
    const type = slot_type || 'subject';
    if (type === 'free' && oldRow?.slot_type !== 'free') {
      await logChange(req.user.id, 'slot_free', { day, hour, subject: oldRow?.subject || '' });
    } else if (oldRow?.subject !== subject) {
      await logChange(req.user.id, 'slot_changed', {
        day, hour,
        from: oldRow?.subject || '(vuoto)',
        to: subject || '(vuoto)'
      });
    }
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Errore server' }); }
});

// Elimina una cella (svuota la materia)
router.delete('/slots', async (req, res) => {
  const { day, hour } = req.body;
  try {
    const r = await pool.query(
      'DELETE FROM slots WHERE user_id=$1 AND day=$2 AND hour=$3 RETURNING *',
      [req.user.id, day, hour]
    );
    if (r.rows[0]) {
      await logChange(req.user.id, 'slot_deleted', {
        day, hour, subject: r.rows[0].subject
      });
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

// Swap celle (drag & drop)
router.post('/slots/swap', async (req, res) => {
  const { from, to } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fR = await client.query('SELECT * FROM slots WHERE user_id=$1 AND day=$2 AND hour=$3', [req.user.id, from.day, from.hour]);
    const tR = await client.query('SELECT * FROM slots WHERE user_id=$1 AND day=$2 AND hour=$3', [req.user.id, to.day, to.hour]);
    const f = fR.rows[0];
    const t = tR.rows[0];

    const upsert = (d, h, sub, col, st) => client.query(
      `INSERT INTO slots (user_id,day,hour,subject,color,slot_type) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id,day,hour) DO UPDATE SET subject=EXCLUDED.subject,color=EXCLUDED.color,slot_type=EXCLUDED.slot_type`,
      [req.user.id, d, h, sub, col, st]
    );
    const del = (d, h) => client.query('DELETE FROM slots WHERE user_id=$1 AND day=$2 AND hour=$3', [req.user.id, d, h]);

    if (t) await upsert(from.day, from.hour, t.subject, t.color, t.slot_type || 'subject');
    else await del(from.day, from.hour);

    if (f) await upsert(to.day, to.hour, f.subject, f.color, f.slot_type || 'subject');
    else await del(to.day, to.hour);

    await client.query('COMMIT');
    await logChange(req.user.id, 'slot_swapped', {
      from: { day: from.day, hour: from.hour, subject: f?.subject },
      to: { day: to.day, hour: to.hour, subject: t?.subject }
    });
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Errore swap' });
  } finally { client.release(); }
});

// --- NOTES ---
router.get('/notes', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM notes WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/notes', async (req, res) => {
  const { day, hour, content, note_date } = req.body;
  if (!content) return res.status(400).json({ error: 'Contenuto obbligatorio' });
  try {
    const r = await pool.query(
      'INSERT INTO notes (user_id, day, hour, content, note_date) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [req.user.id, day, hour, content, note_date || null]
    );
    await logChange(req.user.id, 'note_added', { day, hour, preview: content.slice(0, 40) });
    res.json({ id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.delete('/notes/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM notes WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.user.id]);
    if (r.rows[0]) await logChange(req.user.id, 'note_deleted', { day: r.rows[0].day, hour: r.rows[0].hour });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

// --- SUBSTITUTIONS ---
router.get('/substitutions', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM substitutions WHERE user_id=$1 ORDER BY sub_date DESC', [req.user.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/substitutions', async (req, res) => {
  const { day, hour, hour_to, substitute, sub_date, note } = req.body;
  if (!substitute || !sub_date) return res.status(400).json({ error: 'Dati mancanti' });
  try {
    const r = await pool.query(
      'INSERT INTO substitutions (user_id, day, hour, hour_to, substitute, sub_date, note) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [req.user.id, day, hour, hour_to || hour, substitute, sub_date, note || '']
    );
    await logChange(req.user.id, 'sub_added', { day, hour, substitute, sub_date });
    res.json({ id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.delete('/substitutions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM substitutions WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

// --- CHANGELOG ---
router.get('/changelog', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM change_log WHERE user_id=$1 ORDER BY created_at DESC LIMIT 60',
      [req.user.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

// --- SHARE ---
router.get('/share', async (req, res) => {
  try {
    const r = await pool.query('SELECT token FROM share_tokens WHERE user_id=$1', [req.user.id]);
    res.json({ token: r.rows[0]?.token || null });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/share', async (req, res) => {
  try {
    const existing = await pool.query('SELECT token FROM share_tokens WHERE user_id=$1', [req.user.id]);
    if (existing.rows.length) return res.json({ token: existing.rows[0].token });
    const token = crypto.randomBytes(18).toString('hex');
    await pool.query('INSERT INTO share_tokens (user_id, token) VALUES ($1, $2)', [req.user.id, token]);
    res.json({ token });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.delete('/share', async (req, res) => {
  try {
    await pool.query('DELETE FROM share_tokens WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

// --- EXPORT / IMPORT ---
router.get('/export', async (req, res) => {
  try {
    const [sR, slR, nR, subR, vacR] = await Promise.all([
      pool.query('SELECT * FROM user_settings WHERE user_id=$1', [req.user.id]),
      pool.query('SELECT day, hour, subject, color, slot_type FROM slots WHERE user_id=$1', [req.user.id]),
      pool.query('SELECT day, hour, content, note_date FROM notes WHERE user_id=$1', [req.user.id]),
      pool.query('SELECT day, hour, hour_to, substitute, sub_date, note FROM substitutions WHERE user_id=$1', [req.user.id]),
      pool.query('SELECT name, start_date, end_date, color FROM vacations WHERE user_id=$1 ORDER BY start_date', [req.user.id])
    ]);
    const s = sR.rows[0];
    res.json({
      version: 3,
      exportedAt: new Date().toISOString(),
      settings: { schoolDays: JSON.parse(s?.school_days || '[]'), hoursPerDay: s?.hours_per_day || 6 },
      slots: slR.rows, notes: nR.rows, substitutions: subR.rows, vacations: vacR.rows
    });
  } catch (e) { res.status(500).json({ error: 'Errore export' }); }
});

router.post('/import', async (req, res) => {
  const { settings, slots, notes, substitutions, vacations } = req.body;
  if (!settings || !Array.isArray(slots) || !Array.isArray(notes) || !Array.isArray(substitutions))
    return res.status(400).json({ error: 'Formato non valido' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE user_settings SET school_days=$1, hours_per_day=$2, setup_complete=1 WHERE user_id=$3`,
      [JSON.stringify(settings.schoolDays), settings.hoursPerDay, req.user.id]);
    await client.query('DELETE FROM slots WHERE user_id=$1', [req.user.id]);
    await client.query('DELETE FROM notes WHERE user_id=$1', [req.user.id]);
    await client.query('DELETE FROM substitutions WHERE user_id=$1', [req.user.id]);
    await client.query('DELETE FROM vacations WHERE user_id=$1', [req.user.id]);
    for (const s of slots)
      await client.query('INSERT INTO slots (user_id,day,hour,subject,color,slot_type) VALUES ($1,$2,$3,$4,$5,$6)',
        [req.user.id, s.day, s.hour, s.subject, s.color, s.slot_type || 'subject']);
    for (const n of notes)
      await client.query('INSERT INTO notes (user_id,day,hour,content,note_date) VALUES ($1,$2,$3,$4,$5)',
        [req.user.id, n.day, n.hour, n.content, n.note_date || null]);
    for (const s of substitutions)
      await client.query('INSERT INTO substitutions (user_id,day,hour,hour_to,substitute,sub_date,note) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [req.user.id, s.day, s.hour, s.hour_to || s.hour, s.substitute, s.sub_date, s.note || '']);
    if (Array.isArray(vacations)) {
      for (const v of vacations)
        await client.query('INSERT INTO vacations (user_id,name,start_date,end_date,color) VALUES ($1,$2,$3,$4,$5)',
          [req.user.id, v.name, v.start_date, v.end_date, v.color || '#7c3aed']);
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Errore importazione' });
  } finally { client.release(); }
});

// Modifica nota
router.put('/notes/:id', async (req, res) => {
  const { content, note_date } = req.body;
  if (!content) return res.status(400).json({ error: 'Contenuto obbligatorio' });
  try {
    await pool.query(
      'UPDATE notes SET content=$1, note_date=$2 WHERE id=$3 AND user_id=$4',
      [content, note_date || null, req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

// Modifica supplenza
router.put('/substitutions/:id', async (req, res) => {
  const { substitute, hour, hour_to, sub_date, note } = req.body;
  if (!substitute || !sub_date) return res.status(400).json({ error: 'Dati mancanti' });
  try {
    await pool.query(
      'UPDATE substitutions SET substitute=$1, hour=$2, hour_to=$3, sub_date=$4, note=$5 WHERE id=$6 AND user_id=$7',
      [substitute, hour, hour_to || hour, sub_date, note || '', req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

// --- VACATIONS ---
router.get('/vacations', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM vacations WHERE user_id=$1 ORDER BY start_date', [req.user.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/vacations', async (req, res) => {
  const { name, start_date, end_date, color } = req.body;
  if (!name || !start_date || !end_date) return res.status(400).json({ error: 'Dati mancanti' });
  try {
    const r = await pool.query(
      'INSERT INTO vacations (user_id, name, start_date, end_date, color) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [req.user.id, name, start_date, end_date, color || '#7c3aed']
    );
    res.json({ id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.put('/vacations/:id', async (req, res) => {
  const { name, start_date, end_date, color } = req.body;
  if (!name || !start_date || !end_date) return res.status(400).json({ error: 'Dati mancanti' });
  try {
    await pool.query(
      'UPDATE vacations SET name=$1, start_date=$2, end_date=$3, color=$4 WHERE id=$5 AND user_id=$6',
      [name, start_date, end_date, color, req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.delete('/vacations/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM vacations WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

module.exports = router;