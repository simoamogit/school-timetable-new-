// frontend/src/api/index.js
import axios from 'axios';

// In produzione usa la variabile d'ambiente, in dev usa il proxy di Vite
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  // FIX: prima non c'era nessun timeout, quindi in assenza di risposta
  // (backend down, DB irraggiungibile, DNS...) la richiesta restava appesa
  // per minuti, legata solo al timeout di rete del browser/sistema operativo.
  // 35s bastano a coprire un "risveglio a freddo" legittimo del piano free
  // di Render (di solito 30-50s) senza lasciare l'utente in attesa a lungo
  // se il backend è davvero irraggiungibile.
  timeout: 35000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    // Nessuna risposta ricevuta (timeout, server down, DNS, CORS "silenzioso"
    // per assenza di risposta): lo segnaliamo esplicitamente così la UI può
    // mostrare un messaggio utile invece del generico "Errore di rete".
    if (!err.response) {
      err.isUnreachable = true;
    }
    return Promise.reject(err);
  }
);

export default api;