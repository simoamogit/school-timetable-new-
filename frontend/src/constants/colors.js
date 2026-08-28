// frontend/src/constants/colors.js — NUOVO FILE
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