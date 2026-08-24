import { Suspense } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import { AuthGate } from '@/components/AuthGate';
import SettingsClient from './SettingsClient';

export default function SettingsPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Suspense>
          <AuthGate>
            <SettingsClient />
          </AuthGate>
        </Suspense>
      </main>
      <ToastProvider />
    </div>
  );
}
