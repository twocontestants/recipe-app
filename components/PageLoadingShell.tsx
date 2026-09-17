import { Sidebar } from './Sidebar';

export function PageLoadingShell({ planner = false, children }: { planner?: boolean; children: React.ReactNode }) {
  return (
    <div className={planner ? 'app-shell is-planner' : 'app-shell'}>
      <Sidebar />
      <main className={planner ? 'main-content is-planner' : 'main-content'}>
        {children}
      </main>
    </div>
  );
}
