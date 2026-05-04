import { Suspense } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import RecipesClient from './RecipesClient';

export default function RecipesPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Suspense>
          <RecipesClient />
        </Suspense>
      </main>
      <ToastProvider />
    </div>
  );
}
