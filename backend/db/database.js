const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  family: 4
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
        school_days TEXT NOT NULL DEFAULT '[]',
        hours_per_day INTEGER NOT NULL DEFAULT 6,
        setup_complete INTEGER NOT NULL DEFAULT 0,
        locked INTEGER NOT NULL DEFAULT 0,
        theme TEXT DEFAULT 'dark'
      );
      CREATE TABLE IF NOT EXISTS slots (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        day TEXT NOT NULL,
        hour INTEGER NOT NULL,
        subject TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#2563eb',
        UNIQUE(user_id, day, hour)
      );
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        day TEXT NOT NULL,
        hour INTEGER NOT NULL,
        content TEXT NOT NULL,
        note_date TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS substitutions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        day TEXT NOT NULL,
        hour INTEGER NOT NULL,
        hour_to INTEGER,
        substitute TEXT NOT NULL,
        sub_date TEXT NOT NULL,
        note TEXT DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS change_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS share_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
        token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Migrazioni sicure — non toccano dati esistenti
    const migrations = [
      `ALTER TABLE substitutions ADD COLUMN IF NOT EXISTS hour_to INTEGER`,
      `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#2563eb'`,
      `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS hidden_hours TEXT DEFAULT '[]'`,
      `ALTER TABLE slots ADD COLUMN IF NOT EXISTS slot_type TEXT DEFAULT 'subject'`,
      `UPDATE substitutions SET hour_to = hour WHERE hour_to IS NULL`,
      `CREATE TABLE IF NOT EXISTS vacations (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, color TEXT DEFAULT '#7c3aed', created_at TIMESTAMPTZ DEFAULT NOW())`,
    ];
    for (const m of migrations) {
      try { await client.query(m); } catch (_) { /* già presente */ }
    }

    console.log('✅ Database inizializzato');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };