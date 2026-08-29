// Palette M3 "tonal_spot": colori pastello a bassa saturazione, tutti
// abbastanza chiari da restare leggibili con testo scuro sopra (var(--text)),
// così non serve più il trucco text-bianco + text-shadow di prima.
export const SUBJECT_COLORS = [
  '#DCE1FF', // periwinkle
  '#EADDFF', // violet
  '#FFD9E4', // rose
  '#FFDAD4', // coral
  '#FFDDB8', // orange
  '#FCE5A8', // amber
  '#D9EFC0', // lime
  '#C8EFC0', // green
  '#B7EFE8', // teal
  '#C2E8FF', // sky
  '#D3DAFF', // indigo
  '#F0D9E8', // mauve
];

export const VACATION_COLORS = [
  '#EADDFF', // violet
  '#FFD9E4', // rose
  '#FFDAD4', // coral
  '#FFDDB8', // orange
  '#FCE5A8', // amber
  '#C8EFC0', // green
  '#B7EFE8', // teal
  '#DCE1FF', // periwinkle
  '#C2E8FF', // sky
];

// Testo sempre var(--text) (scuro): tutte le tonalità sopra sono abbastanza
// chiare da garantire un contrasto leggibile in entrambi i temi, quindi non
// serve calcolare un "ink" diverso per ciascun colore.
export const SUBJECT_TEXT = 'var(--text)';

// FIX contrasto: var(--text) segue il TEMA dell'app (chiaro/scuro), non la
// luminosità reale dello sfondo colorato della materia. In dark mode
// var(--text) è quasi bianco: su una materia pastello chiaro il testo
// "si compenetra" con lo sfondo, esattamente il bug segnalato. Questa
// funzione calcola la luminanza relativa (WCAG) del colore e sceglie
// testo scuro o chiaro di conseguenza, indipendentemente dal tema.
export function getContrastText(hex) {
  if (!hex) return '#1C1B1F';
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const lin = v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.5 ? '#1C1B1F' : '#F4EFF4';
}