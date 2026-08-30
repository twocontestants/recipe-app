import { Suspense } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import RecipePageClient from '../RecipePageClient';

export default function RecipePage({
  params,
}: {
  params: { id: string; slug?: string[] };
}) {
  const slugs = params.slug ?? [];
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Suspense>
          <RecipePageClient
            recipeId={params.id}
            urlSlug={slugs[0]}
            extraSlugSegments={slugs.length > 1}
          />
        </Suspense>
      </main>
      <ToastProvider />
    </div>
  );
}
