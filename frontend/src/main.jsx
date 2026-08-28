// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ShareView from './pages/ShareView.jsx';
import { SnackbarProvider } from './components/SnackbarProvider.jsx';
import { ConfirmProvider } from './components/ConfirmProvider.jsx';
import './index.css';

// Registra service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Routing share URL senza React Router
const shareMatch = window.location.pathname.match(/^\/share\/([a-f0-9]+)$/);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {shareMatch ? (
      <ShareView token={shareMatch[1]} />
    ) : (
      <SnackbarProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </SnackbarProvider>
    )}
  </React.StrictMode>
);