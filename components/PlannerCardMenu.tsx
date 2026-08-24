'use client';

import type { Ref } from 'react';

export type PlannerCardMenuView = 'root' | 'move';

export type PlannerCardMenuDay = {
  index: number;
  name: string;
  dateLabel: string;
};

type Props = {
  view: PlannerCardMenuView;
  right: number;
  y: number;
  up: boolean;
  currentDayIndex: number;
  days: PlannerCardMenuDay[];
  canOpenRecipe: boolean;
  menuRef: Ref<HTMLDivElement>;
  onViewRecipe: () => void;
  onEditRecipe: () => void;
  onReplace: () => void;
  onOpenMove: () => void;
  onBack: () => void;
  onMoveTo: (dayIndex: number) => void;
  onDelete: () => void;
};

export default function PlannerCardMenu({
  view,
  right,
  y,
  up,
  currentDayIndex,
  days,
  canOpenRecipe,
  menuRef,
  onViewRecipe,
  onEditRecipe,
  onReplace,
  onOpenMove,
  onBack,
  onMoveTo,
  onDelete,
}: Props) {
  return (
    <div
      ref={menuRef}
      className={`pl-card-menu ${up ? 'is-up' : ''}`}
      style={{ right, top: y }}
      role="menu"
    >
      {view === 'root' ? (
        <>
          <button
            className="pl-card-menu-item"
            role="menuitem"
            disabled={!canOpenRecipe}
            onClick={onViewRecipe}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            View recipe
          </button>
          <button
            className="pl-card-menu-item"
            role="menuitem"
            disabled={!canOpenRecipe}
            onClick={onEditRecipe}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
            Edit recipe
          </button>
          <div className="pl-card-menu-sep" />
          <button
            className="pl-card-menu-item"
            role="menuitem"
            onClick={onReplace}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
            </svg>
            Replace
          </button>
          <button
            className="pl-card-menu-item"
            role="menuitem"
            onClick={onOpenMove}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            Move to
            <svg className="pl-card-menu-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <div className="pl-card-menu-sep" />
          <button
            className="pl-card-menu-item is-danger"
            role="menuitem"
            onClick={onDelete}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
            Delete
          </button>
        </>
      ) : (
        <>
          <button
            className="pl-card-menu-item pl-card-menu-back"
            onClick={onBack}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Move to…
          </button>
          <div className="pl-card-menu-sep" />
          {days.map(day => {
            const isCurrent = day.index === currentDayIndex;
            return (
              <button
                key={day.index}
                className={`pl-card-menu-item ${isCurrent ? 'is-current' : ''}`}
                role="menuitem"
                disabled={isCurrent}
                onClick={() => onMoveTo(day.index)}
              >
                <span className="pl-card-menu-day">
                  <span>{day.name}</span>
                  <span className="pl-card-menu-date">{day.dateLabel}</span>
                </span>
                {isCurrent && <span className="pl-card-menu-check">✓</span>}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
