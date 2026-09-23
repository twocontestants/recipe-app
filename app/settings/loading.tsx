import { PageLoadingShell } from '@/components/PageLoadingShell';
import { SettingsPageSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <PageLoadingShell>
      <SettingsPageSkeleton />
    </PageLoadingShell>
  );
}
