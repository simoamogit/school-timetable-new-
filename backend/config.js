const crypto = require('crypto');

// Segreto JWT: mai più un valore di fallback hardcoded nel repository.
// - In produzione il processo si ferma subito con un errore chiaro se manca
//   (o se è ancora uno dei valori di esempio/vecchi, ormai pubblici).
// - In sviluppo ne viene generato uno casuale a ogni avvio (le sessioni
//   locali decadono al riavvio, ma nessun segreto noto è mai accettato).
const WEAK = ['', 'cambia_questa_chiave', 'school_super_secret_2024'];
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || WEAK.includes(JWT_SECRET)) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ JWT_SECRET mancante o non sicuro. Impostane uno lungo e casuale nelle variabili d\'ambiente (es. `openssl rand -hex 48`).');
    process.exit(1);
  }
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('⚠️  JWT_SECRET non impostato: ne uso uno temporaneo (solo sviluppo).');
}

// Origini CORS ammesse, separate da virgola. Esempio:
// ALLOWED_ORIGINS=https://mio-orario.netlify.app,http://localhost:5173
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);

module.exports = { JWT_SECRET, ALLOWED_ORIGINS };
