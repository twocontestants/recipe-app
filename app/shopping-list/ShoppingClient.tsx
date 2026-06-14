'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ShoppingItem } from '@/lib/shopping';
import { CATEGORY_ORDER, CATEGORY_EMOJI } from '@/lib/shopping';
import { showToast } from '@/components/Toast';
import { io, Socket } from 'socket.io-client';
import GenerateListModal from '@/components/GenerateListModal';

function genId() { return Math.random().toString(36).slice(2, 10); }

// ── Types ─────────────────────────────────────────────────────────────────────

interface CheckedState {
  [itemKey: string]: { checked: boolean; checkedBy: string; checkedAt: number };
}
interface ItemOverride { displayName?: string; displayAmount?: string; category?: string; hidden?: boolean; }
interface CustomItem { id: string; displayName: string; category: string; displayAmount: string; }
interface ResolvedItem {
  key: string; displayName: string; displayAmount: string;
  resolvedCategory: string; isCustom: boolean;
  originalServerName?: string; recipes?: string[];
}
interface ShoppingListMeta {
  id: string; name: string; subtitle: string;
  generated_at: string; recipe_ids: string[];
}

// ── Shopper name ──────────────────────────────────────────────────────────────
const SHOPPER_NAMES = ['Alex','Sam','Jordan','Taylor','Morgan','Casey','Riley','Quinn'];
function getShopperName(): string {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('shopper-name') : null;
  if (stored) return stored;
  const name = SHOPPER_NAMES[Math.floor(Math.random() * SHOPPER_NAMES.length)] + ' ' + Math.floor(Math.random() * 99 + 1);
  if (typeof window !== 'undefined') localStorage.setItem('shopper-name', name);
  return name;
}

// ── Item row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: ResolvedItem; isChecked: boolean; checkedBy?: string;
  isDragging: boolean; isDropBefore: boolean; isDropAfter: boolean;
  onToggle: () => void; onDelete: () => void;
  onNameChange: (v: string) => void; onAmountChange: (v: string) => void;
  onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void;
  onDragOverItem: (e: React.DragEvent) => void; onDropOnItem: (e: React.DragEvent) => void;
  onEnterAtEnd: () => void; recipes?: string[]; recipeLinks?: Record<string, string>;
}

function ItemRow({ item, isChecked, checkedBy, isDragging, isDropBefore, isDropAfter, onToggle, onDelete, onNameChange, onAmountChange, onDragStart, onDragEnd, onDragOverItem, onDropOnItem, onEnterAtEnd, recipes, recipeLinks }: ItemRowProps) {
  const nameRef = useRef<HTMLSpanElement>(null);
  const amountRef = useRef<HTMLSpanElement>(null);

  useEffect(() => { if (nameRef.current && nameRef.current.textContent !== item.displayName) nameRef.current.textContent = item.displayName; }, [item.displayName]);
  useEffect(() => { if (amountRef.current && amountRef.current.textContent !== item.displayAmount) amountRef.current.textContent = item.displayAmount; }, [item.displayAmount]);

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = window.getSelection(); const node = nameRef.current;
      if (sel && node) { const range = sel.getRangeAt(0); if (range.endOffset === (node.textContent?.length ?? 0)) { const val = node.textContent?.trim() ?? ''; if (val) onNameChange(val); onEnterAtEnd(); return; } }
      (e.currentTarget as HTMLElement).blur();
    }
    if (e.key === 'Escape') { if (nameRef.current) nameRef.current.textContent = item.displayName; (e.currentTarget as HTMLElement).blur(); }
    if (e.key === 'Tab') { e.preventDefault(); amountRef.current?.focus(); }
  };
  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault(); onAmountChange(amountRef.current?.textContent?.trim() ?? ''); (e.currentTarget as HTMLElement).blur();
      if (e.key === 'Enter') onEnterAtEnd();
    }
  };

  return (
    <div className={`shop-item-wrap ${isDragging ? 'item-dragging' : ''} ${isDropBefore ? 'drop-before-item' : ''} ${isDropAfter ? 'drop-after-item' : ''}`} onDragOver={onDragOverItem} onDrop={onDropOnItem}>
      <div className={`shop-item ${isChecked ? 'is-checked' : ''}`}>
        <div className="item-drag-handle no-print" draggable onDragStart={onDragStart} onDragEnd={onDragEnd}><DragHandle size={11} /></div>
        <div className="shop-checkbox" onClick={onToggle}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div className="shop-item-name-wrap">
          {recipes && recipes.length > 0 && (
            <div className="recipe-source-bar" title={recipes.join(', ')}>
              {recipes.map((r, i) => {
                const url = recipeLinks?.[r];
                return url ? (
                  <a key={i} className="recipe-source-pip recipe-source-link" href={url} target="_blank" rel="noopener noreferrer"
                     onClick={e => e.stopPropagation()} title={`Open original recipe: ${r}`}>
                    {r}
                    <svg className="recipe-source-ext" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                ) : (
                  <span key={i} className="recipe-source-pip">{r}</span>
                );
              })}
            </div>
          )}
          <span ref={nameRef} className={`shop-item-name ${isChecked ? 'checked-text' : ''}`} contentEditable={!isChecked} suppressContentEditableWarning onBlur={e => onNameChange(e.currentTarget.textContent?.trim() ?? '')} onKeyDown={handleNameKeyDown} spellCheck={false} />
        </div>
        <div className="shop-item-amount-wrap">
          <span ref={amountRef} className="shop-item-amount" contentEditable={!isChecked} suppressContentEditableWarning data-placeholder="qty" onBlur={e => onAmountChange(e.currentTarget.textContent?.trim() ?? '')} onKeyDown={handleAmountKeyDown} spellCheck={false} />
        </div>
        <button className="item-delete-btn no-print" onClick={onDelete}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
    </div>
  );
}

// ── New item row ──────────────────────────────────────────────────────────────

function NewItemRow({ autoFocus, onCommit, onCancel }: { autoFocus?: boolean; onCommit: (n: string, a: string) => void; onCancel: () => void; }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(''); const [amount, setAmount] = useState('');
  useEffect(() => { if (autoFocus) nameRef.current?.focus(); }, [autoFocus]);
  const commit = () => { if (name.trim()) onCommit(name.trim(), amount.trim()); else onCancel(); };
  return (
    <div className="new-item-row">
      <div className="item-drag-handle" style={{ opacity: 0, pointerEvents: 'none' }}><DragHandle size={11} /></div>
      <div className="shop-checkbox new-item-checkbox" />
      <input ref={nameRef} className="new-item-name" placeholder="New item…" value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (name.trim()) { onCommit(name.trim(), amount.trim()); setName(''); setAmount(''); nameRef.current?.focus(); } } if (e.key === 'Escape') { e.preventDefault(); onCancel(); } if (e.key === 'Tab') { e.preventDefault(); amountRef.current?.focus(); } }}
        onBlur={() => setTimeout(() => { if (!amountRef.current?.matches(':focus')) commit(); }, 100)} />
      <input ref={amountRef} className="new-item-amount" placeholder="qty" value={amount} onChange={e => setAmount(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { e.preventDefault(); onCancel(); } }}
        onBlur={() => setTimeout(() => { if (!nameRef.current?.matches(':focus')) commit(); }, 100)} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ShoppingListClient() {
  const [lists, setLists] = useState<ShoppingListMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [serverItems, setServerItems] = useState<ShoppingItem[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

  const [checked, setChecked] = useState<CheckedState>({});
  const [itemOverrides, setItemOverrides] = useState<Record<string, ItemOverride>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({});
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [itemOrder, setItemOrder] = useState<Record<string, string[]>>({});
  const [subtitle, setSubtitle] = useState('');

  const [showDropdown, setShowDropdown] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState(false);

  const [connected, setConnected] = useState(false);
  const [activeShoppers, setActiveShoppers] = useState(1);
  const [shopperName] = useState<string>(() => typeof window !== 'undefined' ? getShopperName() : 'You');
  const [recentActivity, setRecentActivity] = useState<string | null>(null);
  // title → original source URL, for linking recipe pills to the real recipe
  const [recipeSources, setRecipeSources] = useState<Record<string, string>>({});
  const [hideChecked, setHideChecked] = useState(false);

  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState('');
  const [insertingIn, setInsertingIn] = useState<{ cat: string; afterKey: string | null } | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [dragCat, setDragCat] = useState<string | null>(null);
  const [dropCat, setDropCat] = useState<{ key: string; position: 'before' | 'after' } | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dropItemTarget, setDropItemTarget] = useState<{ key: string; position: 'before' | 'after' } | null>(null);
  const [dropItemCat, setDropItemCat] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const activityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkedSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);
  const catInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Stable handle on the current list id for socket callbacks (whose effect
  // runs once with [] deps and would otherwise capture a stale activeId).
  const activeIdRef = useRef<string | null>(activeId);
  activeIdRef.current = activeId;
  // The DB is the source of truth for everything. Sockets only relay live
  // updates so other connected clients stay in sync between reads. These
  // signatures track the last-persisted value of each slice so we skip
  // redundant saves: the no-op resave right after a load, the ping-pong from a
  // remote refetch, and re-persisting a delta a remote client already saved.
  const lastStructSig = useRef<string>('');
  const lastSubtitleSig = useRef<string>('');
  const lastCheckedSig = useRef<string>('');
  // Tracks whether the socket has connected before, so we can tell a genuine
  // reconnect (which may have missed live updates) from the first connect.
  const everConnected = useRef(false);

  const activeList = lists.find(l => l.id === activeId) ?? null;

  // ── Socket ────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Connect ALL clients to the single socket server (Render). Vercel is
    // serverless and can't host the long-lived Socket.IO server, and two
    // separate processes don't share rooms — so every client, whichever
    // platform served the page, must point at the same origin for live sync.
    // Set NEXT_PUBLIC_SOCKET_URL to the Render URL. When unset (local dev), it
    // falls back to same-origin, which is correct because `npm run dev` runs
    // server.js locally.
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const socket = io(socketUrl, { path: '/api/socketio', transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      if (activeIdRef.current) {
        socket.emit('join-list', activeIdRef.current);
        // A reconnect may have missed live deltas while we were offline —
        // silently re-read the full list (incl. checked) from the DB to catch up.
        if (everConnected.current) fetchActiveList(activeIdRef.current, false, true);
      }
      everConnected.current = true;
    });
    socket.on('disconnect', () => setConnected(false));
    // A check/uncheck from another client. Apply it locally; record the
    // resulting signature so our own save effect treats it as already-persisted
    // (the originating client already wrote it to the DB) and doesn't re-save.
    socket.on('item-updated', ({ itemName, checked: isChecked, checkedBy }: any) => {
      setChecked(prev => {
        const next = { ...prev };
        if (isChecked) next[itemName] = { checked: true, checkedBy, checkedAt: Date.now() };
        else delete next[itemName];
        lastCheckedSig.current = JSON.stringify(next);
        return next;
      });
      if (checkedBy !== shopperName) {
        const msg = isChecked ? `${itemName} checked off` : `${itemName} unchecked`;
        setRecentActivity(msg);
        if (activityTimer.current) clearTimeout(activityTimer.current);
        activityTimer.current = setTimeout(() => setRecentActivity(null), 3000);
      }
    });
    // Another client cleared all checks.
    socket.on('cleared', () => { setChecked(() => { lastCheckedSig.current = JSON.stringify({}); return {}; }); });
    // Another client changed the list structure (add/delete/rename/reorder/
    // subtitle) and persisted it. Re-pull the structural state from the DB.
    socket.on('list-changed', () => { if (activeIdRef.current) fetchActiveList(activeIdRef.current, true); });
    socket.on('shopper-count', (count: number) => setActiveShoppers(count));
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (socketRef.current?.connected && activeId) socketRef.current.emit('join-list', activeId);
  }, [activeId]);

  // Self-heal: when the tab regains focus/visibility it may have missed live
  // updates (background tabs get throttled and sockets can drop). Silently
  // re-read the full list from the DB — the source of truth — to resync.
  useEffect(() => {
    const resync = () => {
      if (document.visibilityState === 'visible' && activeIdRef.current) {
        fetchActiveList(activeIdRef.current, false, true);
      }
    };
    window.addEventListener('focus', resync);
    document.addEventListener('visibilitychange', resync);
    return () => {
      window.removeEventListener('focus', resync);
      document.removeEventListener('visibilitychange', resync);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => { if (!dropdownRef.current?.contains(e.target as Node)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  // ── Fetch lists ───────────────────────────────────────────────────────────

  const fetchLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const res = await fetch('/api/shopping-lists');
      const data: ShoppingListMeta[] = await res.json();
      setLists(data);
      if (data.length > 0 && !activeId) setActiveId(data[0].id); // most recent
    } catch { showToast('Failed to load lists', 'error'); }
    finally { setLoadingLists(false); }
  }, [activeId]);

  useEffect(() => { fetchLists(); }, []);

  // Build a title → original-source-URL map so shopping-list recipe pills can
  // link straight to the real recipe (not our parsed copy).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/recipes');
        const data = await res.json();
        if (Array.isArray(data)) {
          const map: Record<string, string> = {};
          for (const r of data) if (r?.title && r?.source_url) map[r.title] = r.source_url;
          setRecipeSources(map);
        }
      } catch { /* links just won't render; pills still show */ }
    })();
  }, []);

  // ── Fetch active list items ───────────────────────────────────────────────

  // refresh=true: structural-only (used for remote `list-changed`; leaves
  //   checked state to live deltas). refresh=false: full read incl. checked.
  // silent=true: skip the loading spinner (used for background self-heal).
  const fetchActiveList = useCallback(async (id: string, refresh = false, silent = false) => {
    if (!refresh && !silent) { setLoadingItems(true); }
    if (!refresh) { isFirstLoad.current = true; }
    try {
      const res = await fetch(`/api/shopping-lists?id=${id}`);
      const data = await res.json();
      setServerItems(data.items ?? []);
      setItemOverrides(data.item_overrides ?? {});
      setCustomItems(data.custom_items ?? []);
      setCategoryLabels(data.category_labels ?? {});
      setItemOrder(data.item_order ?? {});
      setSubtitle(data.subtitle ?? '');
      const order = data.category_order?.length > 0
        ? data.category_order
        : CATEGORY_ORDER.filter((c: string) => (data.items ?? []).some((i: ShoppingItem) => i.category === c));
      setCategoryOrder(order);
      // Record what we just loaded so the auto-save effect treats it as a no-op
      // (prevents the post-load resave and the remote-refresh ping-pong).
      lastStructSig.current = JSON.stringify({
        item_overrides: data.item_overrides ?? {},
        custom_items: data.custom_items ?? [],
        category_labels: data.category_labels ?? {},
        category_order: order,
        item_order: data.item_order ?? {},
      });
      lastSubtitleSig.current = JSON.stringify(data.subtitle ?? '');
      // The DB is authoritative for checked state too. Seed it on the initial
      // open and record its signature so the save effect doesn't immediately
      // re-write it. On a remote structural refresh we leave it untouched —
      // live check/uncheck deltas keep it current between full reads.
      if (!refresh) {
        const initialChecked = (data.checked_state && Object.keys(data.checked_state).length > 0) ? data.checked_state : {};
        setChecked(initialChecked);
        lastCheckedSig.current = JSON.stringify(initialChecked);
      }
      isFirstLoad.current = false;
    } catch { showToast('Failed to load list', 'error'); }
    finally { if (!refresh && !silent) setLoadingItems(false); }
  }, []);

  useEffect(() => { if (activeId) fetchActiveList(activeId); }, [activeId]);

  // ── Auto-save edits ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeId) return;
    // checked_state is excluded here — it has its own dedicated save effect.
    const payload = { item_overrides: itemOverrides, custom_items: customItems, category_labels: categoryLabels, category_order: categoryOrder, item_order: itemOrder };
    const sig = JSON.stringify(payload);
    if (sig === lastStructSig.current) return; // nothing actually changed
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/shopping-lists?id=${activeId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        lastStructSig.current = sig;
        // Tell other devices to re-pull the structural state.
        socketRef.current?.emit('list-changed', { listId: activeId });
      } catch { /* silent */ }
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [itemOverrides, customItems, categoryLabels, categoryOrder, itemOrder, activeId]);

  // Save subtitle separately
  useEffect(() => {
    if (!activeId) return;
    const sig = JSON.stringify(subtitle);
    if (sig === lastSubtitleSig.current) return;
    const t = setTimeout(async () => {
      try {
        await fetch(`/api/shopping-lists?id=${activeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subtitle }) });
        lastSubtitleSig.current = sig;
        socketRef.current?.emit('list-changed', { listId: activeId });
      } catch { /* silent */ }
    }, 600);
    return () => clearTimeout(t);
  }, [subtitle, activeId]);

  // Persist checked state to the DB (the source of truth). The live socket
  // delta is emitted separately in the toggle/clear handlers. When a delta
  // arrives from another client, its handler pre-sets lastCheckedSig so this
  // effect no-ops — the originating client already saved it.
  useEffect(() => {
    if (!activeId) return;
    const sig = JSON.stringify(checked);
    if (sig === lastCheckedSig.current) return;
    if (checkedSaveTimer.current) clearTimeout(checkedSaveTimer.current);
    checkedSaveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/shopping-lists?id=${activeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checked_state: checked }) });
        lastCheckedSig.current = sig;
      } catch { /* silent */ }
    }, 500);
    return () => { if (checkedSaveTimer.current) clearTimeout(checkedSaveTimer.current); };
  }, [checked, activeId]);

  useEffect(() => {
    if (editingCat && catInputRef.current) { catInputRef.current.focus(); catInputRef.current.select(); }
  }, [editingCat]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const getResolvedItems = (): ResolvedItem[] => {
    const results: ResolvedItem[] = [];
    for (const si of serverItems) {
      const ov = itemOverrides[si.name] || {};
      if (ov.hidden) continue;
      const rawAmount = si.totalAmount ? `${si.totalAmount}${si.unit ? ' ' + si.unit : ''}` : '';
      results.push({ key: si.name, displayName: ov.displayName ?? si.name, displayAmount: ov.displayAmount ?? rawAmount, resolvedCategory: ov.category ?? si.category, isCustom: false, originalServerName: si.name, recipes: si.recipes });
    }
    for (const ci of customItems) {
      results.push({ key: ci.id, displayName: ci.displayName, displayAmount: ci.displayAmount, resolvedCategory: ci.category, isCustom: true });
    }
    return results;
  };

  const resolvedItems = getResolvedItems();
  const allActiveCats = [...new Set(resolvedItems.map(i => i.resolvedCategory))];
  const orderedCats = [...categoryOrder.filter(c => allActiveCats.includes(c)), ...allActiveCats.filter(c => !categoryOrder.includes(c))];

  const getItemsForCat = (cat: string): ResolvedItem[] => {
    const catItems = resolvedItems.filter(i => i.resolvedCategory === cat);
    const order = itemOrder[cat];
    if (!order) return catItems;
    const ordered = order.map(k => catItems.find(i => i.key === k)).filter(Boolean) as ResolvedItem[];
    return [...ordered, ...catItems.filter(i => !order.includes(i.key))];
  };

  const getCatLabel = (cat: string) => categoryLabels[cat] || cat;
  const allItemKeys = resolvedItems.map(i => i.key);
  const checkedCount = allItemKeys.filter(k => checked[k]?.checked).length;
  const totalCount = allItemKeys.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // ── Toggle ────────────────────────────────────────────────────────────────

  const toggleItem = (item: ResolvedItem) => {
    const key = item.key; const isNowChecked = !checked[key]?.checked;
    setChecked(prev => { const next = { ...prev }; if (isNowChecked) next[key] = { checked: true, checkedBy: shopperName, checkedAt: Date.now() }; else delete next[key]; return next; });
    // Persisted to the DB by the checked-save effect; emit the live delta to
    // other clients. Key by item.key (custom items included) so it round-trips
    // consistently with how checked state is keyed everywhere else.
    socketRef.current?.emit('check-item', { listId: activeId, itemName: key, checked: isNowChecked, checkedBy: shopperName });
  };
  const clearAll = () => { setChecked({}); socketRef.current?.emit('clear-all', { listId: activeId }); };

  // ── Edits ─────────────────────────────────────────────────────────────────

  const updateItemName = (item: ResolvedItem, val: string) => { if (!val) return; if (item.isCustom) setCustomItems(prev => prev.map(c => c.id === item.key ? { ...c, displayName: val } : c)); else setItemOverrides(prev => ({ ...prev, [item.key]: { ...prev[item.key], displayName: val } })); };
  const updateItemAmount = (item: ResolvedItem, val: string) => { if (item.isCustom) setCustomItems(prev => prev.map(c => c.id === item.key ? { ...c, displayAmount: val } : c)); else setItemOverrides(prev => ({ ...prev, [item.key]: { ...prev[item.key], displayAmount: val } })); };
  const deleteItem = (item: ResolvedItem) => {
    if (item.isCustom) setCustomItems(prev => prev.filter(c => c.id !== item.key));
    else setItemOverrides(prev => ({ ...prev, [item.key]: { ...prev[item.key], hidden: true } }));
    setChecked(prev => { const n = { ...prev }; delete n[item.key]; return n; });
    // Drop it from checked state too and broadcast the uncheck, so a deleted
    // item doesn't linger as an orphaned checked entry on other clients.
    if (checked[item.key]?.checked) socketRef.current?.emit('check-item', { listId: activeId, itemName: item.key, checked: false, checkedBy: shopperName });
  };

  const addItem = (cat: string, name: string, amount: string, afterKey: string | null) => {
    const id = genId();
    setCustomItems(prev => [...prev, { id, displayName: name, category: cat, displayAmount: amount }]);
    setCategoryOrder(prev => prev.includes(cat) ? prev : [...prev, cat]);
    setItemOrder(prev => { const current = (prev[cat] ?? getItemsForCat(cat).map(i => i.key)); if (afterKey === null) return { ...prev, [cat]: [...current, id] }; const idx = current.indexOf(afterKey); const next = [...current]; next.splice(idx < 0 ? current.length : idx + 1, 0, id); return { ...prev, [cat]: next }; });
  };

  const commitEditCat = () => { if (!editingCat) return; const trimmed = editingCatValue.trim(); if (trimmed) setCategoryLabels(prev => ({ ...prev, [editingCat]: trimmed })); else setCategoryLabels(prev => { const n = { ...prev }; delete n[editingCat!]; return n; }); setEditingCat(null); };
  const commitAddCategory = () => { const trimmed = newCategoryName.trim(); if (!trimmed) { setShowAddCategory(false); return; } setCategoryLabels(prev => ({ ...prev, [trimmed]: trimmed })); setCategoryOrder(prev => [...prev, trimmed]); setShowAddCategory(false); setNewCategoryName(''); setInsertingIn({ cat: trimmed, afterKey: null }); };

  // ── Drag ──────────────────────────────────────────────────────────────────

  const handleCatDragStart = (e: React.DragEvent, cat: string) => { e.stopPropagation(); setDragCat(cat); setDragItem(null); e.dataTransfer.effectAllowed = 'move'; };
  const handleCatDragOver = (e: React.DragEvent, cat: string) => { if (!dragCat || dragCat === cat) return; e.preventDefault(); e.stopPropagation(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setDropCat({ key: cat, position: e.clientY < rect.top + rect.height / 2 ? 'before' : 'after' }); };
  const handleCatDrop = (e: React.DragEvent, cat: string) => { e.preventDefault(); e.stopPropagation(); if (!dragCat || dragCat === cat) { resetDrag(); return; } const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'; setCategoryOrder(prev => { const order = prev.length > 0 ? [...prev] : [...orderedCats]; const fromIdx = order.indexOf(dragCat); if (fromIdx === -1) return order; const next = [...order]; next.splice(fromIdx, 1); const insertAt = next.indexOf(cat) + (pos === 'after' ? 1 : 0); next.splice(insertAt, 0, dragCat); return next; }); resetDrag(); };
  const handleItemDragStart = (e: React.DragEvent, itemKey: string) => { e.stopPropagation(); setDragItem(itemKey); setDragCat(null); e.dataTransfer.effectAllowed = 'move'; };
  const handleItemDragOverItem = (e: React.DragEvent, itemKey: string) => { if (!dragItem || dragItem === itemKey) return; e.preventDefault(); e.stopPropagation(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setDropItemTarget({ key: itemKey, position: e.clientY < rect.top + rect.height / 2 ? 'before' : 'after' }); setDropItemCat(null); };
  const handleItemDropOnItem = (e: React.DragEvent, targetKey: string, targetCat: string) => { e.preventDefault(); e.stopPropagation(); if (!dragItem || dragItem === targetKey) { resetDrag(); return; } const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'; moveItemToCategory(dragItem, targetCat); setItemOrder(prev => { const catItems = getItemsForCat(targetCat).map(i => i.key).filter(k => k !== dragItem); const insertAt = catItems.indexOf(targetKey) + (pos === 'after' ? 1 : 0); catItems.splice(insertAt, 0, dragItem); return { ...prev, [targetCat]: catItems }; }); resetDrag(); };
  const handleItemDropOnCat = (e: React.DragEvent, cat: string) => { e.preventDefault(); e.stopPropagation(); if (!dragItem) { resetDrag(); return; } moveItemToCategory(dragItem, cat); resetDrag(); };
  const moveItemToCategory = (itemKey: string, newCat: string) => { const ci = customItems.find(c => c.id === itemKey); if (ci) setCustomItems(prev => prev.map(c => c.id === itemKey ? { ...c, category: newCat } : c)); else setItemOverrides(prev => ({ ...prev, [itemKey]: { ...prev[itemKey], category: newCat } })); setCategoryOrder(prev => prev.includes(newCat) ? prev : [...prev, newCat]); };
  const resetDrag = () => { setDragCat(null); setDragItem(null); setDropCat(null); setDropItemTarget(null); setDropItemCat(null); };

  // ── Delete list ───────────────────────────────────────────────────────────

  const handleDeleteList = async () => {
    if (!activeId) return;
    if (!confirm('Delete this shopping list?')) return;
    try {
      await fetch(`/api/shopping-lists?id=${activeId}`, { method: 'DELETE' });
      const remaining = lists.filter(l => l.id !== activeId);
      setLists(remaining);
      setActiveId(remaining[0]?.id ?? null);
      if (!remaining.length) { setServerItems([]); setCustomItems([]); setChecked({}); }
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleCopy = async () => {
    const lines: string[] = [];
    for (const cat of orderedCats) {
      const catItems = getItemsForCat(cat).filter(i => !checked[i.key]?.checked);
      if (!catItems.length) continue;
      lines.push(`\n${getCatLabel(cat)}`);
      catItems.forEach(i => lines.push(`  □ ${i.displayName}${i.displayAmount ? ' — ' + i.displayAmount : ''}`));
    }
    await navigator.clipboard.writeText(lines.join('\n').trim());
    showToast('Copied!', 'success');
  };

  const isEmpty = !loadingItems && serverItems.length === 0 && customItems.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shopping <em>List</em></h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className={`socket-badge ${connected ? 'connected' : 'disconnected'}`}>
            <span className="socket-dot" />
            {connected ? `Live · ${activeShoppers}` : 'Offline'}
          </div>
          {activeId && <button className="btn btn-secondary btn-sm no-print" onClick={handleCopy}>Copy</button>}
          {activeId && <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>Print</button>}
          {checkedCount > 0 && <button className={`btn btn-ghost btn-sm no-print ${hideChecked ? 'toggle-on' : ''}`} onClick={() => setHideChecked(v => !v)}>{hideChecked ? 'Show checked' : 'Hide checked'}</button>}
          {checkedCount > 0 && <button className="btn btn-ghost btn-sm no-print" onClick={clearAll}>Uncheck all</button>}
          <button className="btn btn-primary btn-sm no-print" onClick={() => setShowGenerate(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            New list
          </button>
        </div>
      </div>

      {/* List selector */}
      {!loadingLists && (
        <div className="sl-selector-row no-print" ref={dropdownRef}>
          {lists.length === 0 ? (
            <div className="sl-empty-prompt">
              No lists yet —
              <button className="sl-inline-link" onClick={() => setShowGenerate(true)}>generate your first one</button>
            </div>
          ) : (
            <>
              <div className="sl-dropdown-wrap">
                <button className="sl-dropdown-btn" onClick={() => setShowDropdown(v => !v)}>
                  <div className="sl-dropdown-info">
                    <span className="sl-dropdown-name">{activeList?.name ?? 'Select a list'}</span>
                    {activeList?.subtitle && <span className="sl-dropdown-subtitle">{activeList.subtitle}</span>}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, transition: 'transform 0.15s', transform: showDropdown ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6"/></svg>
                </button>

                {showDropdown && (
                  <div className="sl-dropdown-menu">
                    {lists.map(l => (
                      <button key={l.id} className={`sl-dropdown-item ${l.id === activeId ? 'active' : ''}`}
                        onClick={() => { setActiveId(l.id); setShowDropdown(false); }}>
                        <div className="sl-item-info">
                          <span className="sl-item-name">{l.name}</span>
                          {l.subtitle && <span className="sl-item-subtitle">{l.subtitle}</span>}
                          <span className="sl-item-meta">
                            {l.recipe_ids.length} recipe{l.recipe_ids.length !== 1 ? 's' : ''} · {new Date(l.generated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        {l.id === activeId && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="sl-delete-btn" onClick={handleDeleteList} title="Delete list">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              </button>
            </>
          )}
        </div>
      )}

      {/* Subtitle editable field */}
      {activeId && (
        <div className="sl-subtitle-row no-print">
          <input
            className="sl-subtitle-input"
            placeholder="Add a note for this list… (e.g. Birthday week)"
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            maxLength={80}
          />
        </div>
      )}

      {loadingLists || loadingItems ? (
        <div className="empty-state"><div className="loading-dots"><span/><span/><span/></div></div>
      ) : !activeId ? null : isEmpty ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <h3>Nothing in this list yet</h3>
          <p>Add items below or generate a new list from your meal plan.</p>
        </div>
      ) : (
        <div style={{ maxWidth: '700px' }}>
          <div className="progress-bar-wrap no-print">
            <div className="progress-bar-labels"><span>{checkedCount} of {totalCount} items</span><span>{progress}%</span></div>
            <div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
          </div>
          {recentActivity && <div className="activity-toast no-print">{recentActivity}</div>}
          <p className="edit-hint no-print">Click to edit · <kbd>Enter</kbd> adds item · <kbd>Tab</kbd> jumps to qty · Drag to reorder</p>

          {orderedCats.map(cat => {
            const catItems = getItemsForCat(cat);
            if (!catItems.length && insertingIn?.cat !== cat) return null;
            const checkedCat = catItems.filter(i => checked[i.key]?.checked);
            const visibleItems = hideChecked ? catItems.filter(i => !checked[i.key]?.checked) : catItems;
            // When hiding checked items, drop categories that have nothing left to show.
            if (hideChecked && !visibleItems.length && insertingIn?.cat !== cat) return null;
            const isCatDragging = dragCat === cat;
            const isDropTarget = dropCat?.key === cat;

            return (
              <div key={cat}
                className={`shop-category ${isCatDragging ? 'cat-dragging' : ''} ${isDropTarget ? `drop-${dropCat?.position}` : ''}`}
                onDragOver={e => { if (dragCat) handleCatDragOver(e, cat); else if (dragItem) { e.preventDefault(); setDropItemCat(cat); setDropItemTarget(null); } }}
                onDrop={e => { if (dragCat) handleCatDrop(e, cat); else if (dragItem) handleItemDropOnCat(e, cat); }}
                onDragLeave={e => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) { setDropCat(null); setDropItemCat(null); } }}
              >
                <div className={`shop-category-header ${dropItemCat === cat && dragItem ? 'item-drop-target' : ''}`}>
                  <div className="cat-drag-handle no-print" draggable onDragStart={e => handleCatDragStart(e, cat)} onDragEnd={resetDrag}><DragHandle size={13} /></div>
                  <span className="shop-category-emoji">{CATEGORY_EMOJI[cat] || '🛒'}</span>
                  {editingCat === cat ? (
                    <input ref={catInputRef} className="category-edit-input" value={editingCatValue} onChange={e => setEditingCatValue(e.target.value)} onBlur={commitEditCat} onKeyDown={e => { if (e.key === 'Enter') commitEditCat(); if (e.key === 'Escape') setEditingCat(null); }} />
                  ) : (
                    <button className="shop-category-name-btn" onClick={e => { e.stopPropagation(); setEditingCat(cat); setEditingCatValue(getCatLabel(cat)); }}>
                      {getCatLabel(cat)}
                      <svg className="edit-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  )}
                  <span className="shop-category-count">{checkedCat.length > 0 && `${checkedCat.length}/`}{catItems.length}</span>
                  <button className="category-add-btn no-print" onClick={() => setInsertingIn({ cat, afterKey: null })}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    Add
                  </button>
                </div>
                <div className="shop-items">
                  {visibleItems.map(item => (
                    <div key={item.key}>
                      <ItemRow
                        item={item} isChecked={!!checked[item.key]?.checked} checkedBy={checked[item.key]?.checkedBy}
                        isDragging={dragItem === item.key}
                        isDropBefore={dropItemTarget?.key === item.key && dropItemTarget.position === 'before'}
                        isDropAfter={dropItemTarget?.key === item.key && dropItemTarget.position === 'after'}
                        onToggle={() => toggleItem(item)} onDelete={() => deleteItem(item)}
                        onNameChange={val => updateItemName(item, val)} onAmountChange={val => updateItemAmount(item, val)}
                        onDragStart={e => handleItemDragStart(e, item.key)} onDragEnd={resetDrag}
                        onDragOverItem={e => { if (dragItem) handleItemDragOverItem(e, item.key); }}
                        onDropOnItem={e => { if (dragItem) handleItemDropOnItem(e, item.key, cat); }}
                        onEnterAtEnd={() => setInsertingIn({ cat, afterKey: item.key })}
                        recipes={item.recipes}
                        recipeLinks={recipeSources}
                      />
                      {insertingIn?.cat === cat && insertingIn.afterKey === item.key && (
                        <NewItemRow autoFocus onCommit={(n, a) => { addItem(cat, n, a, item.key); setInsertingIn(null); }} onCancel={() => setInsertingIn(null)} />
                      )}
                    </div>
                  ))}
                  {insertingIn?.cat === cat && insertingIn.afterKey === null && (
                    <NewItemRow autoFocus onCommit={(n, a) => { addItem(cat, n, a, null); setInsertingIn(null); }} onCancel={() => setInsertingIn(null)} />
                  )}
                </div>
              </div>
            );
          })}

          {hideChecked && totalCount > 0 && checkedCount === totalCount && (
            <div className="all-done no-print">
              <span className="all-done-emoji">🎉</span>
              <div>
                <strong>All checked off!</strong>
                <button className="sl-inline-link" onClick={() => setHideChecked(false)}>Show checked items</button>
              </div>
            </div>
          )}

          <div className="bottom-controls no-print">
            {showAddCategory ? (
              <div className="add-cat-row">
                <input autoFocus className="add-cat-input" placeholder="New category name…" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commitAddCategory(); if (e.key === 'Escape') setShowAddCategory(false); }} />
                <button className="add-confirm-btn" onClick={commitAddCategory} disabled={!newCategoryName.trim()}>Create</button>
                <button className="add-cancel-btn" onClick={() => setShowAddCategory(false)}>Cancel</button>
              </div>
            ) : (
              <div className="bottom-actions">
                <button className="bottom-btn" onClick={() => { const cat = orderedCats[orderedCats.length - 1] || 'Other'; setCategoryOrder(prev => prev.includes(cat) ? prev : [...prev, cat]); setInsertingIn({ cat, afterKey: null }); }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>Add item
                </button>
                <button className="bottom-btn" onClick={() => setShowAddCategory(true)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>New category
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showGenerate && (
        <GenerateListModal
          onClose={() => setShowGenerate(false)}
          onCreated={async (id) => {
            setShowGenerate(false);
            await fetchLists();
            setActiveId(id);
          }}
        />
      )}

      <style>{`
        .socket-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 0.72rem; padding: 0.3rem 0.65rem; border-radius: 99px; border: 1px solid var(--border); color: var(--ink-muted); }
        .socket-badge.connected { border-color: #B8DDB0; color: #3A6B31; background: #F2FAF0; }
        .socket-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse-dot 2s infinite; }
        .socket-badge.disconnected .socket-dot { animation: none; opacity: 0.4; }
        @keyframes pulse-dot { 0%,100%{opacity:1}50%{opacity:0.4} }

        /* List selector */
        .sl-selector-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; position: relative; }
        .sl-dropdown-wrap { flex: 1; position: relative; }
        .sl-dropdown-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.55rem 0.75rem; background: var(--parchment); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-family: var(--font-body); text-align: left; transition: border-color 0.15s; }
        .sl-dropdown-btn:hover { border-color: var(--ink-muted); }
        .sl-dropdown-info { flex: 1; min-width: 0; }
        .sl-dropdown-name { display: block; font-size: 0.85rem; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sl-dropdown-subtitle { display: block; font-size: 0.72rem; color: var(--rust); font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
        .sl-dropdown-menu { position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 200; background: white; border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 4px 20px rgba(26,22,18,0.12); overflow: hidden; max-height: 260px; overflow-y: auto; }
        .sl-dropdown-item { display: flex; align-items: center; gap: 0.75rem; width: 100%; padding: 0.7rem 1rem; background: none; border: none; border-bottom: 1px solid var(--parchment); font-family: var(--font-body); cursor: pointer; text-align: left; transition: background 0.12s; }
        .sl-dropdown-item:last-child { border-bottom: none; }
        .sl-dropdown-item:hover { background: var(--parchment); }
        .sl-dropdown-item.active { background: rgba(181,69,27,0.04); }
        .sl-item-info { flex: 1; min-width: 0; }
        .sl-item-name { display: block; font-size: 0.85rem; color: var(--ink); }
        .sl-item-subtitle { display: block; font-size: 0.72rem; color: var(--rust); font-style: italic; }
        .sl-item-meta { display: block; font-size: 0.7rem; color: var(--ink-muted); margin-top: 2px; }
        .sl-delete-btn { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 0.6rem; color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; transition: all 0.15s; flex-shrink: 0; }
        .sl-delete-btn:hover { border-color: #c0392b; color: #c0392b; }
        .sl-empty-prompt { font-size: 0.85rem; color: var(--ink-muted); padding: 0.5rem 0; }
        .sl-inline-link { background: none; border: none; color: var(--rust); font-size: 0.85rem; font-family: var(--font-body); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; padding: 0 0.25rem; }

        /* Subtitle */
        .sl-subtitle-row { margin-bottom: 1.25rem; }
        .sl-subtitle-input { width: 100%; max-width: 700px; border: none; outline: none; background: transparent; font-size: 16px; font-family: var(--font-body); color: var(--ink-soft); padding: 0; font-style: italic; }
        .sl-subtitle-input::placeholder { color: var(--ink-muted); }
        .sl-subtitle-input:focus { color: var(--ink); }

        .progress-bar-wrap { margin-bottom: 1.5rem; }
        .progress-bar-labels { display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--ink-muted); margin-bottom: 0.4rem; }
        .progress-bar-track { height: 5px; background: var(--parchment); border-radius: 3px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: var(--sage); border-radius: 3px; transition: width 0.4s ease; }

        .activity-toast { background: var(--ink); color: var(--cream); font-size: 0.78rem; padding: 0.55rem 0.85rem; border-radius: 6px; margin-bottom: 1rem; }
        .shopper-label { font-size: 0.75rem; color: var(--ink-muted); margin-bottom: 0.5rem; }
        .edit-hint { font-size: 0.72rem; color: var(--ink-muted); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 5px; font-style: italic; flex-wrap: wrap; }
        .edit-hint kbd { font-style: normal; background: var(--parchment); border: 1px solid var(--border); border-radius: 3px; padding: 0 4px; font-size: 0.68rem; font-family: var(--font-body); color: var(--ink-soft); }

        .shop-category { margin-bottom: 1.75rem; transition: opacity 0.15s; position: relative; }
        .shop-category.cat-dragging { opacity: 0.4; }
        .shop-category.drop-before { border-top: 2px solid var(--rust); padding-top: 4px; }
        .shop-category.drop-after { border-bottom: 2px solid var(--rust); padding-bottom: 4px; }
        .shop-category-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; border-bottom: 1.5px solid var(--border); transition: background 0.15s; border-radius: 4px 4px 0 0; padding: 0.3rem 0.35rem 0.45rem; }
        .shop-category-header.item-drop-target { background: rgba(181,69,27,0.06); border-bottom-color: var(--rust); border-bottom-width: 2px; }
        .cat-drag-handle { cursor: grab; color: var(--border); display: flex; align-items: center; padding: 2px; border-radius: 3px; transition: color 0.15s; flex-shrink: 0; }
        .cat-drag-handle:hover { color: var(--ink-muted); }
        .shop-category-emoji { font-size: 15px; flex-shrink: 0; }
        .shop-category-name-btn { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; padding: 0; cursor: pointer; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink-soft); font-weight: 400; flex: 1; font-family: var(--font-body); transition: color 0.15s; }
        .shop-category-name-btn:hover { color: var(--rust); }
        .edit-icon { opacity: 0; transition: opacity 0.15s; }
        .shop-category-name-btn:hover .edit-icon { opacity: 1; }
        .category-edit-input { flex: 1; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink); font-family: var(--font-body); border: none; border-bottom: 1.5px solid var(--rust); outline: none; background: transparent; padding: 0 0 2px; min-width: 0; }
        .shop-category-count { font-size: 0.7rem; color: var(--ink-muted); flex-shrink: 0; }
        .category-add-btn { display: inline-flex; align-items: center; gap: 4px; padding: 0.2rem 0.55rem; background: none; border: 1px dashed var(--border); border-radius: 99px; font-size: 0.68rem; color: var(--ink-muted); cursor: pointer; font-family: var(--font-body); transition: all 0.15s; white-space: nowrap; }
        .category-add-btn:hover { border-color: var(--rust); color: var(--rust); }

        .shop-items { display: flex; flex-direction: column; }
        .shop-item-wrap { position: relative; }
        .shop-item-wrap.item-dragging { opacity: 0.35; }
        .shop-item-wrap.drop-before-item::before { content:''; display:block; height:2px; background:var(--rust); border-radius:2px; margin-bottom:1px; }
        .shop-item-wrap.drop-after-item::after { content:''; display:block; height:2px; background:var(--rust); border-radius:2px; margin-top:1px; }
        .shop-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.35rem; border-radius: 5px; border-bottom: 1px solid var(--parchment); transition: background 0.1s; }
        .shop-item:hover { background: var(--parchment); }
        .shop-item.is-checked { opacity: 0.42; }
        .item-drag-handle { cursor: grab; color: var(--border); display: flex; align-items: center; flex-shrink: 0; padding: 2px; border-radius: 3px; transition: color 0.15s; }
        .item-drag-handle:hover { color: var(--ink-muted); }
        .shop-checkbox { width: 20px; height: 20px; border: 1.5px solid var(--border); border-radius: 5px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; background: white; cursor: pointer; }
        .shop-item.is-checked .shop-checkbox { background: var(--sage); border-color: var(--sage); }
        .shop-checkbox svg { display: none; }
        .shop-item.is-checked .shop-checkbox svg { display: block; }
        .shop-item-name-wrap { flex: 1; min-width: 0; }
        .recipe-source-bar { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 2px; }
        .recipe-source-pip { font-size: 0.58rem; color: var(--ink-muted); background: var(--parchment); border: 1px solid var(--border); border-radius: 3px; padding: 1px 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; line-height: 1.4; font-style: italic; }
        a.recipe-source-link { display: inline-flex; align-items: center; gap: 3px; text-decoration: none; cursor: pointer; transition: color 0.12s, border-color 0.12s, background 0.12s; }
        a.recipe-source-link:hover { color: var(--rust); border-color: var(--rust); background: rgba(181,69,27,0.06); }
        .recipe-source-ext { flex-shrink: 0; opacity: 0.6; }
        a.recipe-source-link:hover .recipe-source-ext { opacity: 1; }
        .btn.toggle-on { background: var(--sage-light); border-color: var(--sage); color: var(--sage); }
        .all-done { display: flex; align-items: center; gap: 0.75rem; padding: 1.25rem; background: var(--sage-light); border: 1px solid #cdd6c3; border-radius: 10px; margin: 1rem 0; }
        .all-done-emoji { font-size: 1.5rem; }
        .all-done strong { display: block; color: var(--sage); font-size: 0.95rem; margin-bottom: 2px; }
        .shop-item-name { font-size: clamp(16px, 0.9rem, 18px); color: var(--ink); display: block; border-radius: 3px; padding: 2px 4px; margin: -2px -4px; outline: none; transition: background 0.12s, box-shadow 0.12s; cursor: text; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .shop-item-name.checked-text { text-decoration: line-through; }
        .shop-item-name[contenteditable="true"]:hover { background: rgba(181,69,27,0.06); }
        .shop-item-name[contenteditable="true"]:focus { background: white; box-shadow: 0 0 0 1.5px var(--rust); white-space: normal; overflow: visible; }
        .shop-item-amount-wrap { flex-shrink: 0; }
        .shop-item-amount { font-family: var(--font-display); font-size: clamp(16px, 0.95rem, 18px); color: var(--rust); white-space: nowrap; display: block; border-radius: 3px; padding: 2px 5px; margin: -2px -5px; outline: none; min-width: 28px; text-align: right; transition: background 0.12s, box-shadow 0.12s; cursor: text; }
        .shop-item-amount[contenteditable="true"]:empty::before { content: attr(data-placeholder); color: var(--border); font-family: var(--font-body); font-size: 0.78rem; }
        .shop-item-amount[contenteditable="true"]:hover { background: rgba(181,69,27,0.06); }
        .shop-item-amount[contenteditable="true"]:focus { background: white; box-shadow: 0 0 0 1.5px var(--rust); }
        .shop-item-checker { font-size: 0.68rem; color: var(--ink-muted); font-style: italic; white-space: nowrap; flex-shrink: 0; }
        .item-delete-btn { background: none; border: none; color: var(--border); cursor: pointer; padding: 3px; display: flex; align-items: center; flex-shrink: 0; border-radius: 4px; transition: all 0.15s; opacity: 0; }
        .shop-item:hover .item-delete-btn { opacity: 1; }
        .item-delete-btn:hover { color: var(--rust); background: rgba(181,69,27,0.08); }

        .new-item-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.35rem; border-radius: 0 0 5px 5px; background: rgba(181,69,27,0.025); border: 1px dashed var(--border); border-top: none; animation: fadeInRow 0.12s ease; }
        @keyframes fadeInRow { from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none} }
        .new-item-checkbox { opacity: 0.2; pointer-events: none; }
        .new-item-name { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 16px; font-family: var(--font-body); color: var(--ink); padding: 2px 4px; }
        .new-item-name::placeholder { color: var(--border); }
        .new-item-amount { width: 60px; border: none; outline: none; background: transparent; font-family: var(--font-display); font-size: 16px; color: var(--rust); text-align: right; padding: 2px 5px; }
        .new-item-amount::placeholder { color: var(--border); font-family: var(--font-body); font-size: 0.78rem; }

        .bottom-controls { margin-top: 1rem; }
        .bottom-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
        .bottom-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.5rem 1rem; background: none; border: 1px dashed var(--border); border-radius: 6px; font-size: 0.8rem; color: var(--ink-muted); cursor: pointer; font-family: var(--font-body); transition: all 0.15s; }
        .bottom-btn:hover { border-color: var(--rust); color: var(--rust); }
        .add-cat-row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
        .add-cat-input { flex: 1; min-width: 0; padding: 0.45rem 0.7rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.88rem; font-family: var(--font-body); color: var(--ink); outline: none; transition: border-color 0.15s; }
        .add-cat-input:focus { border-color: var(--rust); }
        .add-confirm-btn { padding: 0.38rem 0.85rem; background: var(--rust); color: white; border: none; border-radius: 5px; font-size: 0.8rem; font-family: var(--font-body); cursor: pointer; transition: opacity 0.15s; }
        .add-confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .add-cancel-btn { padding: 0.38rem 0.75rem; background: white; color: var(--ink-muted); border: 1px solid var(--border); border-radius: 5px; font-size: 0.8rem; font-family: var(--font-body); cursor: pointer; transition: all 0.15s; }

        /* Prevent horizontal overflow on all screens */
        .shop-item-name[contenteditable="true"]:focus { white-space: normal; overflow: visible; word-break: break-word; }

        /* Mobile */
        @media (max-width: 600px) {
          .sl-selector-row { margin-bottom: 0.4rem; }
          .shop-item { padding: 0.4rem 0.2rem; gap: 0.35rem; }
          .shop-item-name { font-size: 0.82rem; }
          .shop-item-amount { font-size: 0.85rem; }
          .shop-category-header { padding: 0.25rem 0.2rem 0.4rem; }
          .edit-hint { display: none; }
        }

        @media print {
          .shop-item.is-checked { display: none; }
          .no-print { display: none !important; }
          .shop-category-header { border-bottom: 1px solid #ccc; }
        }
      `}</style>
    </>
  );
}

function DragHandle({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 18" fill="currentColor">
      <circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/>
      <circle cx="3" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/>
      <circle cx="3" cy="15" r="1.5"/><circle cx="9" cy="15" r="1.5"/>
    </svg>
  );
}
