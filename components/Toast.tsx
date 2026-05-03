'use client';

import { useState, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastCounter = 0;
let globalSetToasts: React.Dispatch<React.SetStateAction<Toast[]>> | null = null;

export function showToast(message: string, type: Toast['type'] = 'info') {
  if (globalSetToasts) {
    const id = ++toastCounter;
    globalSetToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      globalSetToasts?.(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Register global setter
  if (!globalSetToasts) globalSetToasts = setToasts;
  
  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
