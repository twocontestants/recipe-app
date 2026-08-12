'use client';

import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_EMOJI } from '@/lib/shopping';
import { showToast } from '@/components/Toast';

interface DictionaryEntry {
  name: string;
  category: string;
  autoCategory: string;
  source: 'custom' | 'auto';
  count: number;
  examples: string[];
}

export default function SettingsClient() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [onlyCustom, setOnlyCustom] = useState(false);
  const [savingName, setSavingName] = useState<string | null>(null);
  const [prefMode, setPrefMode] = useState<'ask' | 'always' | 'never'>('ask');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/ingredient-categories');
        const data = await res.json();
        setEntries(data.entries ?? []);
        setCategories(data.categories ?? []);
      } catch {
        showToast('Couldn\u2019t load the dictionary', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/preferences');
        if (res.ok) { const d = await res.json(); if (d?.categoryPrefMode) setPrefMode(d.categoryPrefMode); }
      } catch { /* default ask */ }
    })();
  }, []);

  const changePrefMode = (mode: 'ask' | 'always' | 'never') => {
    setPrefMode(mode);
    fetch('/api/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryPrefMode: mode }) })
      .then(() => showToast('Preference saved', 'success'))
      .catch(() => showToast('Couldn\u2019t save preference', 'error'));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(e => {
      if (onlyCustom && e.source !== 'custom') return false;
      if (!q) return true;
      return e.name.includes(q) || e.examples.some(x => x.toLowerCase().includes(q));
    });
  }, [entries, query, onlyCustom]);

  const grouped = useMemo(() => {
    const map = new Map<string, DictionaryEntry[]>();
    for (const cat of categories) map.set(cat, []);
    for (const e of filtered) {
      if (!map.has(e.category)) map.set(e.category, []);
      map.get(e.category)!.push(e);
    }
    return [...map.entries()].filter(([, items]) => items.length > 0);
  }, [filtered, categories]);

  const customCount = entries.filter(e => e.source === 'custom').length;

  const changeCategory = async (name: string, category: string) => {
    const prev = entries;
    setEntries(es => es.map(e => e.name === name ? { ...e, category, source: 'custom' } : e));
    setSavingName(name);
    try {
      const res = await fetch('/api/ingredient-categories', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setEntries(prev);
      showToast('Couldn\u2019t save that change', 'error');
    } finally {
      setSavingName(null);
    }
  };

  const resetToAuto = async (name: string) => {
    const prev = entries;
    setEntries(es => es.map(e => e.name === name ? { ...e, category: e.autoCategory, source: 'auto' } : e));
    setSavingName(name);
    try {
      const res = await fetch(`/api/ingredient-categories?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      setEntries(prev);
      showToast('Couldn\u2019t reset that item', 'error');
    } finally {
      setSavingName(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ingredient <em>Categories</em></h1>
        </div>
      </div>

      <p className="settings-intro">
        Every ingredient across your recipes is grouped under a standardised name and sorted into an aisle.
        Change any category here and it sticks — new shopping lists will use your choice instead of the automatic guess.
      </p>

      <div className="settings-pref">
        <div className="settings-pref-label">
          <span className="settings-pref-title">Saving category changes from the shopping list</span>
          <span className="settings-pref-sub">When you drag an item to a new aisle in a list, should that be remembered for future lists?</span>
        </div>
        <select className="settings-select" value={prefMode} onChange={e => changePrefMode(e.target.value as 'ask' | 'always' | 'never')}>
          <option value="ask">Ask me each time</option>
          <option value="always">Always save</option>
          <option value="never">Never save</option>
        </select>
      </div>

      {loading ? (
        <div className="empty-state"><div className="loading-dots"><span/><span/><span/></div></div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧂</div>
          <h3>No ingredients yet</h3>
          <p>Add some recipes and their ingredients will show up here to categorise.</p>
        </div>
      ) : (
        <div className="settings-wrap">
          <div className="settings-controls no-print">
            <input
              className="settings-search"
              placeholder="Search ingredients…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button
              className={`btn btn-sm ${onlyCustom ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setOnlyCustom(v => !v)}
              title="Show only items you've customised"
            >
              {onlyCustom ? 'Showing custom' : `Custom only${customCount ? ` (${customCount})` : ''}`}
            </button>
          </div>

          {grouped.length === 0 ? (
            <div className="settings-noresults">No ingredients match “{query}”.</div>
          ) : grouped.map(([cat, items]) => (
            <section key={cat} className="settings-cat">
              <div className="settings-cat-header">
                <span className="settings-cat-emoji">{CATEGORY_EMOJI[cat] || '🛒'}</span>
                <span className="settings-cat-name">{cat}</span>
                <span className="settings-cat-count">{items.length}</span>
              </div>
              <div className="settings-rows">
                {items.map(e => (
                  <div key={e.name} className={`settings-row ${savingName === e.name ? 'is-saving' : ''}`}>
                    <div className="settings-row-main">
                      <span className="settings-row-name">{e.name}</span>
                      {e.examples.length > 0 && (
                        <span className="settings-row-examples" title={e.examples.join(' · ')}>
                          {e.examples.join(' · ')}
                        </span>
                      )}
                    </div>
                    <div className="settings-row-controls">
                      <span className="settings-row-meta">
                        {e.count > 0 ? `${e.count} recipe${e.count !== 1 ? 's' : ''}` : 'unused'}
                      </span>
                      {e.source === 'custom' && (
                        <button className="settings-reset" onClick={() => resetToAuto(e.name)} title="Reset to automatic category">
                          reset
                        </button>
                      )}
                      <select
                        className={`settings-select ${e.source === 'custom' ? 'is-custom' : ''}`}
                        value={e.category}
                        onChange={ev => changeCategory(e.name, ev.target.value)}
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        {!categories.includes(e.category) && <option value={e.category}>{e.category}</option>}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <style jsx>{`
        .settings-intro { max-width: 640px; color: var(--ink-soft); font-size: 0.9rem; line-height: 1.55; margin: 0 0 1.4rem; }
        .settings-pref { display: flex; align-items: center; gap: 1rem; max-width: 720px; margin: 0 0 1.6rem; padding: 0.9rem 1rem; background: var(--sage-light); border: 1px solid var(--border); border-radius: var(--radius); }
        .settings-pref-label { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .settings-pref-title { font-size: 0.85rem; color: var(--ink); font-weight: 500; }
        .settings-pref-sub { font-size: 0.74rem; color: var(--ink-muted); line-height: 1.4; }
        .settings-wrap { max-width: 720px; min-width: 0; }
        .settings-controls { display: flex; gap: 0.6rem; align-items: center; margin-bottom: 1.2rem; flex-wrap: wrap; }
        .settings-search { flex: 1 1 180px; min-width: 0; width: auto; padding: 0.5rem 0.8rem; border: 1px solid var(--border); border-radius: var(--radius); font-family: var(--font-body); font-size: 0.9rem; color: var(--ink); background: white; outline: none; transition: border-color 0.15s; }
        .settings-search:focus { border-color: var(--rust); }

        .settings-cat { margin-bottom: 1.5rem; }
        .settings-cat-header { display: flex; align-items: center; gap: 0.5rem; padding-bottom: 0.5rem; margin-bottom: 0.4rem; border-bottom: 1px solid var(--border); }
        .settings-cat-emoji { font-size: 1rem; flex-shrink: 0; }
        .settings-cat-name { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink-soft); font-weight: 500; flex: 1; min-width: 0; }
        .settings-cat-count { font-size: 0.7rem; color: var(--ink-muted); flex-shrink: 0; }

        .settings-rows { display: flex; flex-direction: column; }
        .settings-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.35rem;
          border-bottom: 1px solid var(--parchment);
          transition: background 0.1s, opacity 0.15s;
          min-width: 0;
        }
        .settings-row:hover { background: var(--parchment); }
        .settings-row.is-saving { opacity: 0.55; }
        .settings-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .settings-row-name { font-size: 0.92rem; color: var(--ink); text-transform: capitalize; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .settings-row-examples { font-size: 0.68rem; color: var(--ink-muted); font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .settings-row-controls { display: flex; align-items: center; gap: 0.5rem; flex: 0 0 auto; min-width: 0; }
        .settings-row-meta { font-size: 0.68rem; color: var(--ink-muted); white-space: nowrap; flex-shrink: 0; }
        .settings-reset { background: none; border: none; color: var(--ink-muted); font-size: 0.68rem; cursor: pointer; padding: 2px 4px; border-radius: 3px; font-family: var(--font-body); text-decoration: underline; transition: color 0.15s; flex-shrink: 0; }
        .settings-reset:hover { color: var(--rust); }
        .settings-select {
          width: auto;
          max-width: 12.5rem;
          flex: 0 0 auto;
          padding: 0.32rem 0.5rem;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: white;
          font-family: var(--font-body);
          font-size: 0.8rem;
          color: var(--ink-soft);
          cursor: pointer;
          outline: none;
          transition: border-color 0.15s, color 0.15s;
        }
        .settings-select:focus { border-color: var(--rust); }
        .settings-select.is-custom { border-color: var(--rust); color: var(--rust); font-weight: 500; }
        .settings-pref .settings-select { max-width: 14rem; }

        .settings-noresults { color: var(--ink-muted); font-size: 0.88rem; padding: 1rem 0; }

        @media (max-width: 600px) {
          .settings-pref { flex-wrap: wrap; align-items: flex-start; gap: 0.75rem; }
          .settings-pref .settings-select { width: 100%; max-width: none; font-size: 16px; }
          .settings-search { flex: 1 1 100%; font-size: 16px; }
          .settings-row {
            flex-direction: column;
            align-items: stretch;
            gap: 0.4rem;
            padding: 0.65rem 0.25rem;
          }
          .settings-row-name { white-space: normal; overflow: visible; text-overflow: unset; font-size: 0.85rem; }
          .settings-row-examples { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
          .settings-row-controls { width: 100%; justify-content: flex-end; flex-wrap: wrap; }
          .settings-row-meta { margin-right: auto; }
          .settings-select { max-width: min(12rem, 58vw); font-size: 16px; }
        }
      `}</style>
    </>
  );
}
