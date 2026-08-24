import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import { AuthGate } from '@/components/AuthGate';
import ShoppingListClient from './ShoppingClient';

export default function ShoppingListPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <AuthGate>
          <ShoppingListClient />
        </AuthGate>
      </main>
      <ToastProvider />
    </div>
  );
}
