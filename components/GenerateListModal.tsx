'use client';

import { useState, useEffect } from 'react';
import { showToast } from './Toast';
import {
  dayDateOf,
  getThisDisplayWeek,
  localDateIso,
  parseDayOfWeek,
  shiftWeek,
  storageCoords,
  type DayKey,
} from '@/lib/plannerDays';
import { storageWeeksForDateRange } from '@/lib/plannerMonth';
import { mealOnDate } from '@/lib/plannerDate';
import {
  defaultSelectedMealKeys,
  generateListDateRange,
  generateListWeekTag,
  generateListWeeks,
  mealDayLabel,
  mealEntryKey,
  visibleGenerateListWeeks,
  type GenerateListMeal,
} from '@/lib/generateListOptions';

interface Props {
  onClose: () => void;
  onCreated: (listId: string) => void;
  defaultWeekStart?: string; // pre-selected display week (from planner)
  weekStartsOn?: DayKey;
}

export default function GenerateListModal({ onClose, onCreated, defaultWeekStart, weekStartsOn = 'monday' }: Props) {
  const thisWeek = getThisDisplayWeek(weekStartsOn);
  const prevWeek = shiftWeek(thisWeek, -1);
  const weeks = generateListWeeks(weekStartsOn, defaultWeekStart);

  const [meals, setMeals] = useState<Record<string, GenerateListMeal[]>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subtitle, setSubtitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const map: Record<string, GenerateListMeal[]> = {};
      const { from, to } = generateListDateRange(weeks);
      let plans: unknown[] = [];
      try {
        const weeksParam = storageWeeksForDateRange(from, to).join(',');
        const res = await fetch(`/api/planner?from=${from}&to=${to}&weeks=${encodeURIComponent(weeksParam)}`);
        const data = await res.json();
        if (Array.isArray(data)) plans = data;
      } catch { plans = []; }
      for (const wk of weeks) {
        const entries: GenerateListMeal[] = [];
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const day = dayDateOf(wk, dayIndex);
          const coords = storageCoords(day);
          const iso = localDateIso(day);
          for (const raw of plans) {
            if (!raw || typeof raw !== 'object') continue;
            const p = raw as {
              id?: string;
              recipe_id?: string;
              recipe?: { title?: string };
              day_of_week?: unknown;
              week_start?: string;
              planned_on?: string;
            };
            const storedDay = parseDayOfWeek(p.day_of_week);
            if (!p.recipe_id) continue;
            if (!mealOnDate(p, iso)) continue;
            const id = typeof p.id === 'string' && p.id ? p.id : undefined;
            entries.push({
              key: mealEntryKey({ id, planned_on: iso, recipe_id: p.recipe_id }, entries.length),
              id,
              recipe_id: p.recipe_id,
              recipe_title: p.recipe?.title ?? 'Unknown',
              day_of_week: storedDay ?? coords.dayOfWeek,
              week_start: coords.weekStart,
              planned_on: iso,
            });
          }
        }
        map[wk] = entries;
      }
      setMeals(map);
      const defaultWk = defaultWeekStart ?? thisWeek;
      setSelected(new Set(defaultSelectedMealKeys(map, defaultWk, thisWeek, localDateIso(new Date()))));
      setLoading(false);
    };
    fetchAll();
  }, [weekStartsOn, defaultWeekStart]);

  const toggleMeal = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleWeek = (wk: string) => {
    const wkMeals = (meals[wk] ?? []).map(m => m.key);
    const allSelected = wkMeals.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) wkMeals.forEach(k => next.delete(k));
      else wkMeals.forEach(k => next.add(k));
      return next;
    });
  };

  const selectedCount = selected.size;
  const shownWeeks = visibleGenerateListWeeks(weeks, meals, thisWeek, defaultWeekStart);

  const handleGenerate = async () => {
    if (!selectedCount) { showToast('Select at least one recipe', 'error'); return; }
    setSaving(true);
    try {
      const selectedMeals: GenerateListMeal[] = [];
      for (const wk of weeks) {
        for (const m of meals[wk] ?? []) {
          if (selected.has(m.key)) selectedMeals.push(m);
        }
      }
      const recipe_ids = [...new Set(selectedMeals.map(m => m.recipe_id))];
      const week_starts = [...new Set(selectedMeals.map(m => m.week_start))];
      const mealsPayload = selectedMeals.map(m => ({
        id: m.id,
        recipe_id: m.recipe_id,
        planned_on: m.planned_on,
        week_start: m.week_start,
        day_of_week: m.day_of_week,
      }));

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
      const weekStr = week_starts.length === 1
        ? `Week of ${new Date(week_starts[0] + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
        : `${week_starts.length} weeks`;
      const name = `${weekStr} · ${timeStr}`;

      const res = await fetch('/api/shopping-lists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subtitle, week_starts, recipe_ids, meals: mealsPayload }),
      });
      if (!res.ok) throw new Error();
      const list = await res.json();
      showToast('Shopping list created!', 'success');
      onCreated(list.id);
    } catch { showToast('Failed to create list', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <style>{`
        .glm-overlay {
          position: fixed; inset: 0; z-index: 500;
          background: rgba(26,22,18,0.45);
          display: flex; align-items: flex-end; justify-content: center;
        }
        @media (min-width: 601px) {
          .glm-overlay { align-items: center; padding: 1rem; }
          .glm-sheet { border-radius: 14px !important; max-height: 85vh !important; width: 480px; max-width: min(480px, calc(100% - 2rem)); }
        }
        .glm-sheet {
          background: white; width: 100%; max-height: 92dvh;
          border-radius: 20px 20px 0 0;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .glm-handle { width: 36px; height: 4px; border-radius: 2px; background: var(--border); margin: 10px auto 0; flex-shrink: 0; }
        .glm-header { padding: 14px 20px 12px; border-bottom: 1px solid var(--parchment); flex-shrink: 0; }
        .glm-title { font-family: var(--font-display); font-size: 1.3rem; font-weight: 300; color: var(--ink); margin-bottom: 2px; }
        .glm-sub { font-size: 0.78rem; color: var(--ink-muted); }
        .glm-body { overflow-y: auto; flex: 1; padding: 0 20px 12px; -webkit-overflow-scrolling: touch; }
        .glm-week-section { margin-top: 16px; }
        .glm-week-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .glm-week-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-muted); font-weight: 500; }
        .glm-week-toggle { font-size: 0.72rem; color: var(--rust); background: none; border: none; cursor: pointer; font-family: var(--font-body); padding: 0; }
        .glm-meal-row {
          display: flex; align-items: flex-start; gap: 10px; padding: 9px 12px;
          border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px;
          cursor: pointer; transition: background 0.12s;
          position: relative;
        }
        .glm-meal-row.is-selected { background: rgba(181,69,27,0.05); border-color: rgba(181,69,27,0.3); }
        .glm-checkbox-input {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
        }
        .glm-checkbox-input:focus-visible + .glm-check {
          box-shadow: 0 0 0 2px white, 0 0 0 4px var(--rust);
        }
        .glm-check { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.12s; }
        .glm-meal-row.is-selected .glm-check { background: var(--rust); border-color: var(--rust); }
        .glm-meal-name { flex: 1; font-size: 0.88rem; color: var(--ink); min-width: 0; white-space: normal; overflow-wrap: anywhere; line-height: 1.35; }
        .glm-meal-day { font-size: 0.72rem; color: var(--ink-muted); flex-shrink: 0; padding-top: 2px; }
        .glm-empty { font-size: 0.8rem; color: var(--ink-muted); font-style: italic; padding: 8px 0; }
        .glm-subtitle-field { margin-top: 16px; }
        .glm-subtitle-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-muted); margin-bottom: 6px; display: block; }
        .glm-subtitle-input { width: 100%; padding: 9px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 0.88rem; font-family: var(--font-body); color: var(--ink); outline: none; transition: border-color 0.15s; box-sizing: border-box; }
        .glm-subtitle-input:focus { border-color: var(--rust); }
        .glm-subtitle-input::placeholder { color: var(--ink-muted); font-style: italic; }
        .glm-footer { padding: 12px 20px; border-top: 1px solid var(--parchment); flex-shrink: 0; }
        .glm-generate-btn {
          width: 100%; padding: 13px; background: var(--rust); color: white;
          border: none; border-radius: 10px; font-size: 0.92rem; font-weight: 500;
          font-family: var(--font-body); cursor: pointer; transition: opacity 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
        }
        .glm-generate-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .glm-generate-btn:not(:disabled):hover { opacity: 0.88; }
      `}</style>

      <div className="glm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="glm-sheet" role="dialog" aria-labelledby="glm-title">
          <div className="glm-handle" />
          <div className="glm-header">
            <div className="glm-title" id="glm-title">New shopping list</div>
            <div className="glm-sub">Select recipes to include</div>
          </div>

          <div className="glm-body">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}><div className="loading-dots"><span/><span/><span/></div></div>
            ) : (
              <>
                {shownWeeks.map(wk => {
                  const wkMeals = meals[wk] ?? [];
                  const wkKeys = wkMeals.map(m => m.key);
                  const allSel = wkKeys.length > 0 && wkKeys.every(k => selected.has(k));
                  return (
                    <div key={wk} className="glm-week-section">
                      <div className="glm-week-header">
                        <span className="glm-week-label">{generateListWeekTag(wk, weekStartsOn, prevWeek)}</span>
                        {wkMeals.length > 0 && (
                          <button type="button" className="glm-week-toggle" onClick={() => toggleWeek(wk)}>
                            {allSel ? 'Deselect all' : 'Select all'}
                          </button>
                        )}
                      </div>
                      {wkMeals.length === 0 ? (
                        <p className="glm-empty">Nothing planned for this week</p>
                      ) : wkMeals.map(m => {
                        const isSel = selected.has(m.key);
                        const day = mealDayLabel(m.planned_on);
                        return (
                          <label key={m.key} className={`glm-meal-row ${isSel ? 'is-selected' : ''}`}>
                            <input
                              type="checkbox"
                              className="glm-checkbox-input"
                              checked={isSel}
                              onChange={() => toggleMeal(m.key)}
                            />
                            <span className="glm-check" aria-hidden="true">
                              {isSel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                            </span>
                            <span className="glm-meal-name">{m.recipe_title}</span>
                            <span className="glm-meal-day">{day}</span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}

                <div className="glm-subtitle-field">
                  <label className="glm-subtitle-label" htmlFor="glm-note">Note (optional)</label>
                  <input
                    id="glm-note"
                    className="glm-subtitle-input"
                    placeholder="e.g. Birthday week, Christmas dinner…"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    maxLength={80}
                  />
                </div>
              </>
            )}
          </div>

          <div className="glm-footer">
            <button type="button" className="glm-generate-btn" onClick={handleGenerate} disabled={saving || selectedCount === 0}>
              {saving
                ? <><span className="loading-dots"><span/><span/><span/></span> Generating…</>
                : <>Generate list{selectedCount > 0 ? ` · ${selectedCount} recipe${selectedCount !== 1 ? 's' : ''}` : ''}</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
