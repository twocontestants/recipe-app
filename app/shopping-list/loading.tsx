import { PageLoadingShell } from '@/components/PageLoadingShell';
import { ShoppingPageSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <PageLoadingShell>
      <ShoppingPageSkeleton />
    </PageLoadingShell>
  );
}
