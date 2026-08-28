// frontend/src/components/ConfirmProvider.jsx — NUOVO FILE
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((message, opts = {}) => {
    return new Promise(resolve => {
      resolveRef.current = resolve;
      setDialog({
        title: opts.title || 'Conferma',
        message,
        confirmLabel: opts.confirmLabel || 'Conferma',
        cancelLabel: opts.cancelLabel || 'Annulla',
        danger: !!opts.danger,
      });
    });
  }, []);

  const close = (result) => {
    resolveRef.current?.(result);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="dialog-overlay" onClick={() => close(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-icon">
              <span className="icon" style={{ fontSize: 24 }}>{dialog.danger ? 'warning' : 'help'}</span>
            </div>
            <div className="dialog-title">{dialog.title}</div>
            <div className="dialog-body">{dialog.message}</div>
            <div className="dialog-actions">
              <button className="btn-ghost" style={{ border: 'none', color: 'var(--primary)' }} onClick={() => close(false)}>
                {dialog.cancelLabel}
              </button>
              <button
                className={dialog.danger ? 'btn-danger' : 'btn-tonal'}
                onClick={() => close(true)}>
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// Uso: const confirm = useConfirm();
// const ok = await confirm('Eliminare questa materia?', { danger: true, confirmLabel: 'Elimina' });
// if (!ok) return;
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm deve stare dentro <ConfirmProvider>');
  return ctx;
}