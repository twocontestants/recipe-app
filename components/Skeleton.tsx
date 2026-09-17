import type { CSSProperties, ReactNode } from 'react';

export function Skeleton({
  className = '',
  width,
  height,
  radius,
  style,
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden
    />
  );
}

function Screen({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-label={label}>
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  );
}

export function RecipesGridSkeleton({ label = 'Loading recipes' }: { label?: string } = {}) {
  return (
    <Screen label={label} className="recipe-grid">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="card sk-recipe-card">
          <Skeleton className="sk-recipe-img" />
          <div className="recipe-card-body">
            <Skeleton width="78%" height="1.15rem" />
            <div className="sk-recipe-meta">
              <Skeleton width="4.2rem" height="0.7rem" />
              <Skeleton width="4.8rem" height="0.7rem" />
              <Skeleton width="5.2rem" height="0.7rem" />
            </div>
            <Skeleton width="100%" height="0.7rem" />
            <Skeleton width="62%" height="0.7rem" style={{ marginTop: '0.35rem' }} />
          </div>
          <div className="recipe-card-actions">
            <Skeleton width="3.4rem" height="1.6rem" radius="4px" />
            <Skeleton width="3.4rem" height="1.6rem" radius="4px" />
          </div>
        </div>
      ))}
    </Screen>
  );
}

export function RecipesPageSkeleton() {
  return (
    <>
      <div className="page-header">
        <div>
          <Skeleton width="14rem" height="2.4rem" radius="6px" />
          <Skeleton width="6.5rem" height="0.7rem" style={{ marginTop: '0.55rem', display: 'block' }} />
        </div>
        <div className="page-header-actions">
          <Skeleton width="12rem" height="2.4rem" radius="4px" />
          <Skeleton width="7.5rem" height="2.4rem" radius="4px" />
          <Skeleton width="7.5rem" height="2.4rem" radius="4px" />
        </div>
      </div>
      <RecipesGridSkeleton />
    </>
  );
}

export function RecipeDetailSkeleton() {
  return (
    <Screen label="Loading recipe">
      <div className="page-header">
        <div className="page-header-leading">
          <Skeleton width="4.5rem" height="2.2rem" radius="4px" />
          <div>
            <Skeleton width="min(22rem, 70vw)" height="2rem" radius="6px" />
            <div className="sk-tag-row">
              <Skeleton width="3.4rem" height="1.15rem" radius="99px" />
              <Skeleton width="4.1rem" height="1.15rem" radius="99px" />
            </div>
          </div>
        </div>
        <div className="page-header-actions">
          <Skeleton width="7.2rem" height="1.9rem" radius="4px" />
          <Skeleton width="4.2rem" height="1.9rem" radius="4px" />
        </div>
      </div>
      <Skeleton className="sk-recipe-hero" />
      <Skeleton width="88%" height="1rem" style={{ display: 'block', marginBottom: '0.45rem' }} />
      <Skeleton width="64%" height="1rem" style={{ display: 'block', marginBottom: '1.5rem' }} />
      <div className="recipe-meta-bar">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="recipe-meta-item">
            <Skeleton width="2.2rem" height="1.6rem" style={{ margin: '0 auto' }} />
            <Skeleton width="3.6rem" height="0.6rem" style={{ margin: '0.4rem auto 0' }} />
          </div>
        ))}
      </div>
      <div className="two-col">
        <div>
          <h2 className="section-title">Ingredients</h2>
          <ul className="ingredient-list sk-plain-list">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i}>
                <Skeleton width="3.4rem" height="0.85rem" />
                <Skeleton width={`${55 + (i % 3) * 12}%`} height="0.85rem" />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="section-title">Method</h2>
          <ol className="step-list sk-plain-list">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="sk-step">
                <Skeleton width="100%" height="0.85rem" />
                <Skeleton width={`${68 - i * 8}%`} height="0.85rem" />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Screen>
  );
}

export function PlannerDaysSkeleton({ label = 'Loading planner' }: { label?: string } = {}) {
  return (
    <Screen label={label} className="sk-planner-days">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="sk-planner-day">
          <div className="sk-planner-date">
            <Skeleton width="1.8rem" height="0.6rem" />
            <Skeleton width="1.5rem" height="1.1rem" />
          </div>
          <div className="sk-planner-card">
            <Skeleton className="sk-planner-thumb" />
            <div className="sk-planner-card-copy">
              <Skeleton width={`${46 + (i % 3) * 10}%`} height="0.85rem" />
              <Skeleton width="4.5rem" height="0.65rem" />
            </div>
          </div>
        </div>
      ))}
    </Screen>
  );
}

export function PlannerPageSkeleton() {
  return (
    <div className="sk-planner">
      <div className="sk-planner-nav">
        <div className="sk-planner-nav-bar">
          <Skeleton width="9rem" height="0.95rem" />
          <div className="sk-planner-nav-actions">
            <Skeleton width="1.9rem" height="1.9rem" radius="99px" />
            <Skeleton width="5.4rem" height="1.9rem" radius="99px" />
          </div>
        </div>
        <div className="sk-planner-chips">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} width="100%" height="1.85rem" radius="99px" />
          ))}
        </div>
      </div>
      <PlannerDaysSkeleton />
    </div>
  );
}

export function ShoppingSelectorSkeleton() {
  return (
    <div className="sk-shop-selector-row">
      <Skeleton className="sk-shop-selector" />
      <Skeleton width="2.4rem" height="2.4rem" radius="8px" />
    </div>
  );
}

export function ShoppingItemsSkeleton({ label = 'Loading shopping list' }: { label?: string } = {}) {
  const groups = [4, 3, 5];
  return (
    <Screen label={label} className="sk-shop">
      <Skeleton width="8.5rem" height="0.7rem" />
      <Skeleton className="sk-shop-progress" />
      {groups.map((count, g) => (
        <section key={g} className="sk-shop-cat">
          <div className="sk-shop-cat-head">
            <Skeleton width="1.1rem" height="1.1rem" radius="4px" />
            <Skeleton width={`${5.5 + g}rem`} height="0.7rem" />
            <Skeleton width="1.4rem" height="0.7rem" style={{ marginLeft: 'auto' }} />
          </div>
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="sk-shop-item">
              <Skeleton className="sk-shop-check" />
              <Skeleton width={`${42 + ((g + i) % 4) * 10}%`} height="0.9rem" />
              <Skeleton width="2.4rem" height="0.9rem" style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </section>
      ))}
    </Screen>
  );
}

export function ShoppingPageSkeleton() {
  return (
    <>
      <div className="page-header">
        <Skeleton width="14rem" height="2.4rem" radius="6px" />
        <div className="page-header-actions">
          <Skeleton width="5.5rem" height="1.7rem" radius="99px" />
          <Skeleton width="5.8rem" height="1.7rem" radius="4px" />
        </div>
      </div>
      <ShoppingSelectorSkeleton />
      <ShoppingItemsSkeleton />
    </>
  );
}

export function SettingsDictionarySkeleton({ label = 'Loading ingredient categories' }: { label?: string } = {}) {
  return (
    <Screen label={label} className="sk-settings-dict">
      <div className="sk-settings-controls">
        <Skeleton width="100%" height="2.3rem" radius="4px" />
        <Skeleton width="7.5rem" height="2.3rem" radius="4px" />
      </div>
      {Array.from({ length: 2 }, (_, g) => (
        <section key={g} className="sk-settings-cat">
          <div className="sk-settings-cat-head">
            <Skeleton width="1.1rem" height="1.1rem" radius="4px" />
            <Skeleton width={`${6 + g * 1.4}rem`} height="0.85rem" />
            <Skeleton width="1.5rem" height="0.7rem" />
          </div>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="sk-settings-row">
              <Skeleton width={`${38 + i * 8}%`} height="0.85rem" />
              <Skeleton width="7rem" height="1.7rem" radius="4px" />
            </div>
          ))}
        </section>
      ))}
    </Screen>
  );
}

export function SettingsUsersSkeleton({ label = 'Loading accounts' }: { label?: string } = {}) {
  return (
    <Screen label={label} className="sk-settings-users">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="sk-settings-user">
          <div>
            <Skeleton width={`${6 + i}rem`} height="0.85rem" />
            <Skeleton width="8rem" height="0.65rem" style={{ marginTop: '0.3rem', display: 'block' }} />
          </div>
          <Skeleton width="7rem" height="1.7rem" radius="4px" />
        </div>
      ))}
    </Screen>
  );
}

export function SettingsPageSkeleton() {
  return (
    <>
      <div className="page-header">
        <Skeleton width="10rem" height="2.4rem" radius="6px" />
      </div>
      <section className="account-settings">
        <h2 className="section-title">Account</h2>
        <Skeleton width="16rem" height="0.9rem" style={{ display: 'block', marginBottom: '1rem' }} />
        <Skeleton width="min(22rem, 100%)" height="8.5rem" radius="8px" />
      </section>
      <div className="sk-settings-pref">
        <div>
          <Skeleton width="8.5rem" height="0.85rem" />
          <Skeleton width="18rem" height="0.65rem" style={{ display: 'block', marginTop: '0.4rem' }} />
        </div>
        <Skeleton width="8rem" height="1.8rem" radius="4px" />
      </div>
      <h2 className="section-title">Ingredient categories</h2>
      <SettingsDictionarySkeleton />
    </>
  );
}

export function pageSkeletonForPath(pathname: string | null) {
  if (pathname?.startsWith('/planner')) return <PlannerPageSkeleton />;
  if (pathname?.startsWith('/shopping-list')) return <ShoppingPageSkeleton />;
  if (pathname?.startsWith('/settings')) return <SettingsPageSkeleton />;
  if (pathname && pathname.startsWith('/recipes/') && pathname !== '/recipes') {
    return <RecipeDetailSkeleton />;
  }
  return <RecipesPageSkeleton />;
}

