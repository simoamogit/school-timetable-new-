const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/database');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'school_super_secret_2024';

// REGISTRAZIONE
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password di almeno 6 caratteri' });

  try {
    const hash = await bcrypt.hash(password, 10);

    const userRes = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hash]
    );
    const userId = userRes.rows[0].id;
    await pool.query('INSERT INTO user_settings (user_id) VALUES ($1)', [userId]);

    const token = jwt.sign({ id: userId, username }, SECRET, { expiresIn: '7d' });
    res.json({ token, username, setupComplete: false });
  } catch (e) {
    if (e.code === '23505') {
      res.status(400).json({ error: 'Username o email già esistenti' });
    } else {
      console.error(e);
      res.status(500).json({ error: 'Errore del server' });
    }
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email e password obbligatorie' });

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];
    if (!user) return res.status(400).json({ error: 'Credenziali non valide' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Credenziali non valide' });

    const settingsRes = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [user.id]);
    const settings = settingsRes.rows[0];
    const setupComplete = settings?.setup_complete === 1;

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username, setupComplete });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Errore del server' });
  }
});

module.exports = router;