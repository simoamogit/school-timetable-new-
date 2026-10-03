// Tutte le funzioni lavorano sui componenti LOCALI della data (anno/mese/giorno),
// mai su toISOString(): passare da UTC sfasa il giorno dopo mezzanotte per chi
// è in un fuso avanti rispetto a UTC (es. utenti in Italia).
export const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

export function dayName(date) {
  return DAY_NAMES[date.getDay()];
}

export function todayIso() {
  return toIso(new Date());
}

export function mondayOf(date) {
  const dow = date.getDay();
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

// Vista predefinita su schermi piccoli: dalle 05:00 alle 14:00 "Oggi",
// per il resto della giornata "Domani".
export function autoDayView(now = new Date()) {
  const h = now.getHours();
  return h >= 5 && h < 14 ? 'today' : 'tomorrow';
}

export const isSmallScreen = () => typeof window !== 'undefined' && window.innerWidth < 700;

export const TASK_KINDS = {
  note: { label: 'Nota', short: 'NOTA', icon: 'sticky_note_2' },
  homework: { label: 'Compito', short: 'COMPITO', icon: 'assignment' },
  test: { label: 'Verifica', short: 'VERIFICA', icon: 'quiz' },
};
export const isTask = n => !!n && (n.kind === 'homework' || n.kind === 'test');
