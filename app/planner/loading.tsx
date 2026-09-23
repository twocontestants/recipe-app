import { PageLoadingShell } from '@/components/PageLoadingShell';
import { PlannerPageSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <PageLoadingShell planner>
      <PlannerPageSkeleton />
    </PageLoadingShell>
  );
}
