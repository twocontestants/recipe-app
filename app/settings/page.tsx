import { Suspense } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import SettingsClient from './SettingsClient';

export default function SettingsPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Suspense>
          <SettingsClient />
        </Suspense>
      </main>
      <ToastProvider />
    </div>
  );
}
