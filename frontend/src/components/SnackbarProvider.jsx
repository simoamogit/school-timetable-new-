import { createContext, useCallback, useContext, useRef, useState } from 'react';

const SnackbarContext = createContext(null);

export function SnackbarProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, leaving: true } : it));
    setTimeout(() => setItems(prev => prev.filter(it => it.id !== id)), 200);
  }, []);

  const showSnackbar = useCallback((message, opts = {}) => {
    const id = ++idRef.current;
    const item = { id, message, actionLabel: opts.actionLabel, onAction: opts.onAction, leaving: false };
    setItems(prev => [...prev, item]);
    const duration = opts.duration || 4000;
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <SnackbarContext.Provider value={showSnackbar}>
      {children}
      <div className="snackbar-host">
        {items.map(it => (
          <div key={it.id} className={`snackbar${it.leaving ? ' leaving' : ''}`}>
            <span>{it.message}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {it.actionLabel && (
                <button className="snackbar-action" onClick={() => { it.onAction?.(); dismiss(it.id); }}>
                  {it.actionLabel}
                </button>
              )}
              {/* "x" per nascondere manualmente — utile soprattutto su mobile,
                  dove aspettare i 4s del timeout può risultare scomodo se la
                  snackbar copre qualcosa che si vuole toccare subito. */}
              <button className="snackbar-close" onClick={() => dismiss(it.id)} aria-label="Chiudi">
                <span className="icon" style={{ fontSize: 16 }}>close</span>
              </button>
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