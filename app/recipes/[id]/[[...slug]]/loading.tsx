import { PageLoadingShell } from '@/components/PageLoadingShell';
import { RecipeDetailSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <PageLoadingShell>
      <RecipeDetailSkeleton />
    </PageLoadingShell>
  );
}
