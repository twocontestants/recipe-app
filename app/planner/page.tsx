import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import PlannerClient from './PlannerClient';

export default function PlannerPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <PlannerClient />
      </main>
      <ToastProvider />
    </div>
  );
}
