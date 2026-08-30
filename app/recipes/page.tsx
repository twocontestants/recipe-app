import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import { recipeLegacyListRedirectFromQuery } from '@/lib/recipeLinks';
import RecipesClient from './RecipesClient';

export default function RecipesPage({
  searchParams,
}: {
  searchParams: { open?: string; edit?: string };
}) {
  const dest = recipeLegacyListRedirectFromQuery(searchParams);
  if (dest) redirect(dest);

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
