import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import RecipesClient from './RecipesClient';

export default function RecipesPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <RecipesClient />
      </main>
      <ToastProvider />
    </div>
  );
}
