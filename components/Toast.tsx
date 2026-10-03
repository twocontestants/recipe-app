'use client';

import { useEffect, useState } from 'react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: ToastAction;
}

let toastCounter = 0;
let globalSetToasts: React.Dispatch<React.SetStateAction<Toast[]>> | null = null;

export function showToast(message: string, type: Toast['type'] = 'info', action?: ToastAction) {
  if (globalSetToasts) {
    const id = ++toastCounter;
    globalSetToasts(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      globalSetToasts?.(prev => prev.filter(t => t.id !== id));
    }, action ? 10000 : 3500);
  }
}

export function ToastProvider({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    globalSetToasts = setToasts;
    return () => {
      if (globalSetToasts === setToasts) globalSetToasts = null;
    };
  }, [setToasts]);

  return (
    <>
      {children}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-msg">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  setToasts(prev => prev.filter(x => x.id !== t.id));
                  t.action?.onClick();
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
