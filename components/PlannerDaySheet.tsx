'use client';

import {
  DAY_SHORT,
  dayDateOf,
  displayDayIndex,
  displayDays,
  formatWeekLabel,
  isThisWeek,
  type DayKey,
} from '@/lib/plannerDays';

export interface PlannedMeal {
  title: string;
  meal_type: string;
}

export interface PlannerDaySheetProps {
  title: string;
  recipeTitle: string;
  confirmVerb: string;
  weekStart: string;
  selectedDay: number;
  weekPlan: Record<number, PlannedMeal[]>;
  confirming: boolean;
  onClose: () => void;
  onShiftWeek: (weeks: number) => void;
  onSelectDay: (dayIndex: number) => void;
  onConfirm: () => void;
  weekStartsOn?: DayKey;
}

export default function PlannerDaySheet({
  title,
  recipeTitle,
  confirmVerb,
  weekStart,
  selectedDay,
  weekPlan,
  confirming,
  onClose,
  onShiftWeek,
  onSelectDay,
  onConfirm,
  weekStartsOn = 'monday',
}: PlannerDaySheetProps) {
  const dayKeys = displayDays(weekStartsOn);
  const today = displayDayIndex(new Date(), weekStartsOn);
  const selectedKey = dayKeys[selectedDay] ?? dayKeys[0];
  const selectedDate = dayDateOf(weekStart, selectedDay);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal planner-quick-modal" role="dialog" aria-labelledby="pqm-title">
        <div className="modal-header pqm-header">
          <div>
            <h2 id="pqm-title" className="modal-title pqm-title">{title}</h2>
            <p className="pqm-recipe-name">{recipeTitle}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="pqm-week-row">
          <button type="button" className="pqm-week-arrow" onClick={() => onShiftWeek(-1)} aria-label="Previous week">‹</button>
          <span className="pqm-week-label">{formatWeekLabel(weekStart, new Date(), weekStartsOn)}</span>
          <button type="button" className="pqm-week-arrow" onClick={() => onShiftWeek(1)} aria-label="Next week">›</button>
        </div>

        <div className="pqm-day-list" role="listbox" aria-label="Day of the week">
          {dayKeys.map((key, index) => {
            const isToday = index === today && isThisWeek(weekStart, new Date(), weekStartsOn);
            const isSelected = index === selectedDay;
            const meals = weekPlan[index] || [];
            const date = dayDateOf(weekStart, index);
            return (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`pqm-day-row${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
                onClick={() => onSelectDay(index)}
              >
                <span className="pqm-day-when">
                  <span className="pqm-day-name">{DAY_SHORT[key as DayKey]}</span>
                  <span className="pqm-day-date">{date.getDate()}</span>
                </span>
                <span className="pqm-day-meals">
                  {isToday && <span className="pqm-today-tag">Today</span>}
                  {meals.length > 0 ? (
                    <span className="pqm-meal-titles">
                      {meals.map(m => m.title).join(', ')}
                    </span>
                  ) : (
                    <span className="pqm-meal-empty">Nothing planned</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="pqm-add-btn"
          onClick={onConfirm}
          disabled={confirming}
        >
          {confirming
            ? <span className="loading-dots"><span/><span/><span/></span>
            : <>{confirmVerb} · {DAY_SHORT[selectedKey]} {selectedDate.getDate()}</>}
        </button>
      </div>

      <style>{plannerDaySheetCss}</style>
    </div>
  );
}

export const plannerDaySheetCss = `
  .planner-quick-modal {
    max-width: 420px;
    padding: 1.35rem 1.25rem 1.25rem;
  }
  .pqm-header { margin-bottom: 0.85rem; align-items: flex-start; }
  .pqm-title { font-size: 1.45rem; }
  .pqm-recipe-name {
    font-family: var(--font-display);
    font-style: italic;
    color: var(--ink-soft);
    font-size: 1rem;
    margin: 0.2rem 0 0;
    line-height: 1.3;
  }
  .pqm-week-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.85rem;
    background: var(--parchment);
    border-radius: 10px;
    padding: 0.35rem 0.45rem;
  }
  .pqm-week-label {
    flex: 1;
    text-align: center;
    font-size: 0.88rem;
    color: var(--ink);
    font-weight: 500;
  }
  .pqm-week-arrow {
    background: white;
    border: 1px solid var(--border);
    font-size: 1.15rem;
    cursor: pointer;
    color: var(--ink-soft);
    width: 2rem;
    height: 2rem;
    line-height: 1;
    border-radius: 8px;
    transition: color 0.15s, border-color 0.15s;
  }
  .pqm-week-arrow:hover { color: var(--rust); border-color: var(--rust); }

  .pqm-day-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1rem;
    max-height: min(52vh, 420px);
    overflow-y: auto;
    padding-right: 2px;
  }
  .pqm-day-row {
    display: grid;
    grid-template-columns: 3.25rem minmax(0, 1fr);
    gap: 0.75rem;
    align-items: center;
    width: 100%;
    text-align: left;
    min-height: 52px;
    padding: 0.6rem 0.75rem;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    background: white;
    cursor: pointer;
    font-family: var(--font-body);
    transition: border-color 0.15s, background 0.15s;
  }
  .pqm-day-row:hover { border-color: var(--rust); }
  .pqm-day-row.today { border-color: var(--sage); }
  .pqm-day-row.selected {
    border-color: var(--rust);
    background: var(--rust);
    color: white;
  }
  .pqm-day-when {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    line-height: 1.1;
  }
  .pqm-day-name {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-muted);
    font-weight: 600;
  }
  .pqm-day-date {
    font-size: 1.15rem;
    font-family: var(--font-display);
    color: var(--ink);
    font-weight: 400;
  }
  .pqm-day-row.selected .pqm-day-name,
  .pqm-day-row.selected .pqm-day-date,
  .pqm-day-row.selected .pqm-meal-titles,
  .pqm-day-row.selected .pqm-meal-empty,
  .pqm-day-row.selected .pqm-today-tag { color: white; }
  .pqm-day-meals {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .pqm-today-tag {
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--sage);
  }
  .pqm-meal-titles {
    font-size: 0.88rem;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pqm-meal-empty {
    font-size: 0.82rem;
    color: var(--ink-muted);
  }

  .pqm-add-btn {
    width: 100%;
    min-height: 48px;
    padding: 0.8rem;
    background: var(--rust);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.95rem;
    font-family: var(--font-body);
    cursor: pointer;
    transition: opacity 0.15s;
    font-weight: 500;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  }
  .pqm-add-btn:hover:not(:disabled) { opacity: 0.88; }
  .pqm-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (max-width: 600px) {
    .planner-quick-modal { max-width: 100%; padding: 1.15rem 1rem 1.1rem; }
    .pqm-title { font-size: 1.35rem; }
    .pqm-day-list { max-height: min(58dvh, 480px); }
  }
`;
