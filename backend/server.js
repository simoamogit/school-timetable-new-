require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { ALLOWED_ORIGINS } = require('./config');
const { initDB } = require('./db/database');

const app = express();
app.set('trust proxy', 1); // dietro il proxy di Render: serve per avere l'IP reale

// CORS: l'autenticazione usa un header Bearer (non cookie), ma limitiamo
// comunque le origini quando ALLOWED_ORIGINS è configurata. Le richieste
// senza header Origin (stesso dominio, curl, GitHub Action) passano sempre.
if (!ALLOWED_ORIGINS.length) {
  console.warn('⚠️  ALLOWED_ORIGINS non impostata: CORS aperto a tutte le origini. Impostala (es. https://tuo-sito.netlify.app).');
}
const corsOptions = {
  origin(origin, cb) {
    if (!origin || !ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Share-Token'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/schedule', require('./routes/schedule'));

// Endpoint leggero per verificare se il backend è raggiungibile, senza DB.
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve frontend in produzione
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;

// Il server si avvia subito; initDB() gira in background e, se fallisce,
// logga l'errore senza terminare il processo (evita crash-loop su Render).
app.listen(PORT, () => console.log(`✅ Server su http://localhost:${PORT}`));

initDB().catch(err => {
  console.error('❌ Errore inizializzazione DB (il server resta comunque avviato):', err);
});
