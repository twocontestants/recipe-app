'use client';

import { useState, useEffect } from 'react';
import { showToast } from './Toast';

interface MealEntry {
  recipe_id: string;
  recipe_title: string;
  day_of_week: number;
  week_start: string;
}

interface Props {
  onClose: () => void;
  onCreated: (listId: string) => void;
  defaultWeekStart?: string; // pre-selected week (from planner)
}

const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}
function fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }
function fmtWeekLabel(ws: string): string {
  const d = new Date(ws + 'T00:00:00');
  const sun = new Date(d); sun.setDate(d.getDate() + 6);
  return `${d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${sun.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
}
function isThisWeek(ws: string): boolean { return ws === fmtDate(getMonday(new Date())); }
function isNextWeek(ws: string): boolean {
  const n = getMonday(new Date()); n.setDate(n.getDate() + 7);
  return ws === fmtDate(n);
}
function isPrevWeek(ws: string): boolean {
  const p = getMonday(new Date()); p.setDate(p.getDate() - 7);
  return ws === fmtDate(p);
}
function weekTagLabel(ws: string): string {
  if (isThisWeek(ws)) return 'this week';
  if (isNextWeek(ws)) return 'next week';
  if (isPrevWeek(ws)) return 'last week';
  return fmtWeekLabel(ws);
}

export default function GenerateListModal({ onClose, onCreated, defaultWeekStart }: Props) {
  const monday = getMonday(new Date());
  const thisWeek = fmtDate(monday);
  const nextMonday = new Date(monday); nextMonday.setDate(monday.getDate() + 7);
  const nextWeek = fmtDate(nextMonday);
  const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7);
  const prevWeek = fmtDate(prevMonday);

  const weeks = [prevWeek, thisWeek, nextWeek];

  const [meals, setMeals] = useState<Record<string, MealEntry[]>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subtitle, setSubtitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const map: Record<string, MealEntry[]> = {};
      await Promise.all(weeks.map(async (wk) => {
        try {
          const res = await fetch(`/api/planner?weekStart=${wk}`);
          const plans = await res.json();
          map[wk] = plans.map((p: any) => ({
            recipe_id: p.recipe_id,
            recipe_title: p.recipe?.title ?? 'Unknown',
            day_of_week: p.day_of_week,
            week_start: wk,
          }));
        } catch { map[wk] = []; }
      }));
      setMeals(map);
      // Default-select all meals from the defaultWeekStart (or this week)
      const defaultWk = defaultWeekStart ?? thisWeek;
      const defaultSelected = new Set<string>(
        (map[defaultWk] ?? []).map(m => `${m.week_start}::${m.recipe_id}::${m.day_of_week}`)
      );
      setSelected(defaultSelected);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const toggleMeal = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleWeek = (wk: string) => {
    const wkMeals = (meals[wk] ?? []).map(m => `${m.week_start}::${m.recipe_id}::${m.day_of_week}`);
    const allSelected = wkMeals.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) wkMeals.forEach(k => next.delete(k));
      else wkMeals.forEach(k => next.add(k));
      return next;
    });
  };

  const selectedCount = selected.size;

  const handleGenerate = async () => {
    if (!selectedCount) { showToast('Select at least one recipe', 'error'); return; }
    setSaving(true);
    try {
      // Collect selected recipe_ids and week_starts
      const selectedMeals: MealEntry[] = [];
      for (const wk of weeks) {
        for (const m of meals[wk] ?? []) {
          const key = `${m.week_start}::${m.recipe_id}::${m.day_of_week}`;
          if (selected.has(key)) selectedMeals.push(m);
        }
      }
      const recipe_ids = [...new Set(selectedMeals.map(m => m.recipe_id))];
      const week_starts = [...new Set(selectedMeals.map(m => m.week_start))];

      // Name: "Week of X" or "Multiple weeks" + time
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
      const weekStr = week_starts.length === 1
        ? `Week of ${new Date(week_starts[0] + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
        : `${week_starts.length} weeks`;
      const name = `${weekStr} · ${timeStr}`;

      const res = await fetch('/api/shopping-lists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subtitle, week_starts, recipe_ids }),
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
          .glm-sheet { border-radius: 14px !important; max-height: 85vh !important; width: 480px; max-width: calc(100vw - 2rem); }
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
          display: flex; align-items: center; gap: 10px; padding: 9px 12px;
          border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px;
          cursor: pointer; transition: background 0.12s;
        }
        .glm-meal-row.is-selected { background: rgba(181,69,27,0.05); border-color: rgba(181,69,27,0.3); }
        .glm-check { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.12s; }
        .glm-meal-row.is-selected .glm-check { background: var(--rust); border-color: var(--rust); }
        .glm-meal-name { flex: 1; font-size: 0.88rem; color: var(--ink); min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .glm-meal-day { font-size: 0.72rem; color: var(--ink-muted); flex-shrink: 0; }
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
        <div className="glm-sheet">
          <div className="glm-handle" />
          <div className="glm-header">
            <div className="glm-title">New shopping list</div>
            <div className="glm-sub">Select recipes to include</div>
          </div>

          <div className="glm-body">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}><div className="loading-dots"><span/><span/><span/></div></div>
            ) : (
              <>
                {weeks.map(wk => {
                  const wkMeals = meals[wk] ?? [];
                  const wkKeys = wkMeals.map(m => `${m.week_start}::${m.recipe_id}::${m.day_of_week}`);
                  const allSel = wkKeys.length > 0 && wkKeys.every(k => selected.has(k));
                  return (
                    <div key={wk} className="glm-week-section">
                      <div className="glm-week-header">
                        <span className="glm-week-label">{weekTagLabel(wk)}</span>
                        {wkMeals.length > 0 && (
                          <button className="glm-week-toggle" onClick={() => toggleWeek(wk)}>
                            {allSel ? 'Deselect all' : 'Select all'}
                          </button>
                        )}
                      </div>
                      {wkMeals.length === 0 ? (
                        <p className="glm-empty">Nothing planned for this week</p>
                      ) : wkMeals.map(m => {
                        const key = `${m.week_start}::${m.recipe_id}::${m.day_of_week}`;
                        const isSel = selected.has(key);
                        return (
                          <div key={key} className={`glm-meal-row ${isSel ? 'is-selected' : ''}`} onClick={() => toggleMeal(key)}>
                            <div className="glm-check">
                              {isSel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                            <span className="glm-meal-name">{m.recipe_title}</span>
                            <span className="glm-meal-day">{DAY_NAMES[m.day_of_week]}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                <div className="glm-subtitle-field">
                  <label className="glm-subtitle-label">Note (optional)</label>
                  <input
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
            <button className="glm-generate-btn" onClick={handleGenerate} disabled={saving || selectedCount === 0}>
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
