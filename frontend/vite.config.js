import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
  },
  // In sviluppo le chiamate a /api vengono girate al backend locale (porta 3001),
  // così non servono CORS né variabili d'ambiente lato frontend.
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
