// frontend/src/components/SnackbarProvider.jsx — NUOVO FILE
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const SnackbarContext = createContext(null);

export function SnackbarProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const showSnackbar = useCallback((message, opts = {}) => {
    const id = ++idRef.current;
    const item = { id, message, actionLabel: opts.actionLabel, onAction: opts.onAction, leaving: false };
    setItems(prev => [...prev, item]);
    const duration = opts.duration || 4000;
    setTimeout(() => {
      setItems(prev => prev.map(it => it.id === id ? { ...it, leaving: true } : it));
      setTimeout(() => setItems(prev => prev.filter(it => it.id !== id)), 200);
    }, duration);
  }, []);

  return (
    <SnackbarContext.Provider value={showSnackbar}>
      {children}
      <div className="snackbar-host">
        {items.map(it => (
          <div key={it.id} className={`snackbar${it.leaving ? ' leaving' : ''}`}>
            <span>{it.message}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {it.actionLabel && (
                <button className="snackbar-action" onClick={() => { it.onAction?.(); }}>
                  {it.actionLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}

// Uso: const showSnackbar = useSnackbar(); showSnackbar('Nota eliminata');
// Con azione: showSnackbar('Nota eliminata', { actionLabel: 'Annulla', onAction: undo })
export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar deve stare dentro <SnackbarProvider>');
  return ctx;
}