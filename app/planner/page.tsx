import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import { AuthGate } from '@/components/AuthGate';
import PlannerClient from './PlannerClient';

export default function PlannerPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <AuthGate>
          <PlannerClient />
        </AuthGate>
      </main>
      <ToastProvider />
    </div>
  );
}
