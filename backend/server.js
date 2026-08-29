require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db/database');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/schedule', require('./routes/schedule'));

// Endpoint leggero per verificare velocemente se il backend è raggiungibile,
// senza dipendere dal database. Utile in futuro per un debug rapido
// (es. https://TUO-BACKEND.onrender.com/api/health nella barra degli indirizzi).
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve frontend in produzione
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;

// FIX: prima il server si metteva in ascolto solo DOPO initDB(), e se il DB
// non era raggiungibile l'intero processo usciva con process.exit(1).
// Su Render questo genera un loop continuo di crash/restart: il servizio
// non diventa mai "sano" e ogni richiesta del frontend resta appesa per
// minuti prima di fallire, invece di ricevere subito un errore chiaro.
//
// Ora il server si avvia comunque; initDB() gira in background e, se fallisce,
// logga l'errore ma NON termina il processo. Le singole route che usano il
// database gestiscono già l'errore per conto proprio (routes/auth.js risponde
// con status 500), quindi in caso di problemi al DB l'utente vede un errore
// immediato invece di un timeout infinito.
app.listen(PORT, () => console.log(`✅ Server su http://localhost:${PORT}`));

initDB().catch(err => {
  console.error('❌ Errore inizializzazione DB (il server resta comunque avviato):', err);
});