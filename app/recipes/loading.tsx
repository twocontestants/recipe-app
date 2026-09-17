import { PageLoadingShell } from '@/components/PageLoadingShell';
import { RecipesPageSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <PageLoadingShell>
      <RecipesPageSkeleton />
    </PageLoadingShell>
  );
}
