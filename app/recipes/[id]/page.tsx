import { Suspense } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import RecipePageClient from './RecipePageClient';

export default function RecipePage({ params }: { params: { id: string } }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Suspense>
          <RecipePageClient recipeId={params.id} />
        </Suspense>
      </main>
      <ToastProvider />
    </div>
  );
}
