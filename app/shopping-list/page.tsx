import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import ShoppingListClient from './ShoppingClient';

export default function ShoppingListPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <ShoppingListClient />
      </main>
      <ToastProvider />
    </div>
  );
}
