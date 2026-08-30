'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ShoppingItem, ShoppingContribution } from '@/lib/shopping';
import { CATEGORY_ORDER, CATEGORY_EMOJI, aggregateContributions, normalizeIngredientName } from '@/lib/shopping';
import {
  adoptCheckedState,
  isShoppingListDetail,
  mergeRecipeSourceMaps,
  migrateShoppingListShape,
  recipeSourceMapFromItems,
  shouldAdoptCheckedState,
  type ShoppingListMeta,
} from '@/lib/shoppingList';
import { showToast } from '@/components/Toast';
import { io, Socket } from 'socket.io-client';
import GenerateListModal from '@/components/GenerateListModal';
import { opsNeedListChanged, type ShoppingOp } from '@/lib/shoppingOps';

function genId() { return 'i' + Math.random().toString(36).slice(2, 10); }

// A contribution with a stable id, so a single sub-line can be detached into its
// own item and then tracked like any other item (category, check, order).
type ResolvedContribution = ShoppingContribution & { id: string };

// ── Types ─────────────────────────────────────────────────────────────────────

type CheckedState = Record<string, boolean>;
interface ItemOverride { displayName?: string; displayAmount?: string; category?: string; hidden?: boolean; detached?: boolean; }
interface ResolvedItem {
  key: string; displayName: string; displayAmount: string;
  resolvedCategory: string; isCustom: boolean;
  originalServerName?: string; recipes?: string[];
  contributions?: ResolvedContribution[];
  isDetached?: boolean;
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
  item: ResolvedItem; isChecked: boolean;
  isDragging: boolean; isDropBefore: boolean; isDropAfter: boolean;
  onToggle: () => void; onDelete: () => void;
  onNameChange: (v: string) => void; onAmountChange: (v: string) => void;
  onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void;
  onDragOverItem: (e: React.DragEvent) => void; onDropOnItem: (e: React.DragEvent) => void;
  onEnterAtEnd: () => void; recipes?: string[]; recipeLinks?: Record<string, string>;
  onSubDragStart?: (e: React.DragEvent, contribId: string) => void; onSubDragEnd?: () => void;
  onMoveClick?: (e: React.MouseEvent) => void; onSubMoveClick?: (e: React.MouseEvent, contribId: string) => void;
}

function ItemRow({ item, isChecked, isDragging, isDropBefore, isDropAfter, onToggle, onDelete, onNameChange, onAmountChange, onDragStart, onDragEnd, onDragOverItem, onDropOnItem, onEnterAtEnd, recipes, recipeLinks, onSubDragStart, onSubDragEnd, onMoveClick, onSubMoveClick }: ItemRowProps) {
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

  // A merged item (the same standardised ingredient drawn from several recipes)
  // shows the standardised name on the main row and each recipe's own wording
  // as a sub-line beneath it. A single-source item just shows its one wording.
  const contributions = item.contributions ?? [];
  const isGrouped = contributions.length > 1;
  const fmtContribAmount = (c: ShoppingContribution) =>
    `${c.amount}${c.unit ? ' ' + c.unit : ''}`.trim();

  return (
    <div className={`shop-item-wrap ${isDragging ? 'item-dragging' : ''} ${isDropBefore ? 'drop-before-item' : ''} ${isDropAfter ? 'drop-after-item' : ''}`} onDragOver={onDragOverItem} onDrop={onDropOnItem}>
      <div className={`shop-item ${isChecked ? 'is-checked' : ''}`}>
        <div className="item-drag-handle no-print" draggable onDragStart={onDragStart} onDragEnd={onDragEnd}><DragHandle size={11} /></div>
        <div className="shop-checkbox" onClick={onToggle}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div className="shop-item-name-wrap">
          {!isGrouped && recipes && recipes.length > 0 && (
            <div className="recipe-source-bar" title={recipes.join(', ')}>
              {recipes.map((r, i) => {
                const url = recipeLinks?.[r];
                return url ? (
                  <a key={i} className="recipe-source-pip recipe-source-link" href={url} target="_blank" rel="noopener noreferrer"
                     onClick={e => e.stopPropagation()} title={`Open original recipe: ${r}`}>
                    {r}
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
        {onMoveClick && !isChecked && (
          <button className="item-move-btn no-print" onClick={onMoveClick} title="Move to another aisle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/><line x1="3" y1="12" x2="15" y2="12"/></svg>
          </button>
        )}
        <button className="item-delete-btn no-print" onClick={onDelete}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      {isGrouped && (
        <div className={`shop-subitems ${isChecked ? 'is-checked' : ''}`}>
          {contributions.map((c, i) => {
            const url = c.recipe ? recipeLinks?.[c.recipe] : undefined;
            const canDrag = !isChecked && !!onSubDragStart;
            return (
              <div className="shop-subitem" key={c.id ?? i}>
                <div
                  className={`shop-subitem-handle no-print ${canDrag ? '' : 'is-disabled'}`}
                  draggable={canDrag}
                  onDragStart={e => canDrag && onSubDragStart!(e, c.id)}
                  onDragEnd={() => onSubDragEnd?.()}
                  onClick={e => canDrag && onSubMoveClick?.(e, c.id)}
                  title="Click to move into another aisle, or drag it out"
                ><DragHandle size={9} /></div>
                <div className="shop-subitem-body">
                  {c.recipe && (url ? (
                    <a className="recipe-source-pip recipe-source-link" href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title={`Open original recipe: ${c.recipe}`}>
                      {c.recipe}
                    </a>
                  ) : (
                    <span className="recipe-source-pip">{c.recipe}</span>
                  ))}
                  <div className="shop-subitem-line">
                    <span className="shop-subitem-name">{c.name}</span>
                    {fmtContribAmount(c) && <span className="shop-subitem-amount">{fmtContribAmount(c)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({});
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [itemOrder, setItemOrder] = useState<Record<string, string[]>>({});
  // App-wide behaviour for saving a dragged category change to the dictionary:
  // 'ask' (prompt each time), 'always' (save silently), 'never'.
  const [prefMode, setPrefMode] = useState<'ask' | 'always' | 'never'>('ask');
  // The pending "save this category to your preferences?" prompt, if any.
  const [pendingPref, setPendingPref] = useState<{ name: string; label: string; category: string } | null>(null);
  const [prefDontAsk, setPrefDontAsk] = useState(false);
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
  // Subtitle is still debounced (it's typed), so it keeps a small signature.
  const lastSubtitleSig = useRef<string>('');
  const subtitleRef = useRef(subtitle); subtitleRef.current = subtitle;
  // Op-based sync: structural + checked edits are sent as targeted operations.
  // `pendingOps` counts queued/in-flight op requests; while > 0 a resync must
  // not overwrite local state (it has unconfirmed edits). `opQueue` chains
  // requests so ops apply in the order they were made.
  const pendingOps = useRef(0);
  const opQueue = useRef<Promise<void>>(Promise.resolve());
  // Tracks whether the socket has connected before, so we can tell a genuine
  // reconnect (which may have missed live updates) from the first connect.
  const everConnected = useRef(false);
  // key (item id) → current display name, kept fresh each render so socket
  // callbacks (set up once) can show a readable name in the activity toast
  // instead of the raw id.
  const keyToNameRef = useRef<Record<string, string>>({});
  // When a sub-line is being dragged out of its group, this holds its
  // contribution id until the drop completes the detach.
  const pendingDetachRef = useRef<string | null>(null);
  // Current resolved items, kept fresh for event handlers (move/detach) that
  // need an item's standardised name + category without re-deriving it.
  const resolvedRef = useRef<ResolvedItem[]>([]);

  // Send a batch of operations to the server. Optimistic local state is applied
  // by the caller first; this persists the change as targeted ops (which compose
  // with concurrent edits instead of overwriting) and notifies other devices.
  // Requests are chained so ops land in order; keepalive lets an in-flight op
  // finish even if the tab is closed right after. While ops are pending, a
  // resync won't clobber local state.
  const sendOps = useCallback((ops: ShoppingOp[]) => {
    const id = activeIdRef.current;
    if (!id || ops.length === 0) return;
    pendingOps.current += 1;
    opQueue.current = opQueue.current.then(async () => {
      try {
        const res = await fetch(`/api/shopping-lists?id=${id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ops }), keepalive: true,
        });
        if (!res.ok) throw new Error('save failed');
        if (opsNeedListChanged(ops)) socketRef.current?.emit('list-changed', { listId: id });
      } catch {
        showToast('Couldn\u2019t save a change \u2014 it\u2019ll reconcile on refresh', 'error');
      } finally {
        pendingOps.current -= 1;
      }
    });
  }, []);

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
    // A check/uncheck from another client — apply it locally. The originating
    // client already persisted it via a check op, so we don't re-save.
    socket.on('item-updated', ({ itemName, checked: isChecked, checkedBy }: any) => {
      setChecked(prev => {
        const next = { ...prev };
        if (isChecked) next[itemName] = true;
        else delete next[itemName];
        return next;
      });
      if (checkedBy !== shopperName) {
        const label = keyToNameRef.current[itemName] ?? itemName;
        const msg = isChecked ? `${label} checked off` : `${label} unchecked`;
        setRecentActivity(msg);
        if (activityTimer.current) clearTimeout(activityTimer.current);
        activityTimer.current = setTimeout(() => setRecentActivity(null), 3000);
      }
    });
    // Another client cleared all checks.
    socket.on('cleared', () => { setChecked({}); });
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
  // (fetchActiveList preserves any unsaved local edits, so this can't revert.)
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

  // Structural and checked edits are sent immediately as keepalive ops, so they
  // survive a close on their own. Subtitle is debounced (it's typed), so flush
  // its pending value when leaving the tab.
  useEffect(() => {
    const flush = () => {
      if (!activeIdRef.current) return;
      if (JSON.stringify(subtitleRef.current) !== lastSubtitleSig.current) {
        sendOps([{ t: 'setSubtitle', subtitle: subtitleRef.current }]);
        lastSubtitleSig.current = JSON.stringify(subtitleRef.current);
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    window.addEventListener('blur', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('blur', flush);
      document.removeEventListener('visibilitychange', onVisibility);
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
      const res = await fetch('/api/shopping-lists', { cache: 'no-store' });
      const data: ShoppingListMeta[] = await res.json();
      setLists(data);
      if (data.length > 0 && !activeId) setActiveId(data[0].id); // most recent
    } catch { showToast('Failed to load lists', 'error'); }
    finally { setLoadingLists(false); }
  }, [activeId]);

  useEffect(() => { fetchLists(); }, []);

  // Load the app-wide "save dragged category changes" preference.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/preferences');
        if (res.ok) { const d = await res.json(); if (d?.categoryPrefMode) setPrefMode(d.categoryPrefMode); }
      } catch { /* default to 'ask' */ }
    })();
  }, []);

  // ── Fetch active list items ───────────────────────────────────────────────

  // refresh=true: structural-only (remote `list-changed`; leaves checked to
  //   live deltas). refresh=false: full read incl. checked. silent=true: no
  //   spinner (background self-heal).
  // CRITICAL: after the first load, never overwrite a slice that has unsaved
  // local edits (its live signature differs from the last-saved signature).
  // Otherwise a focus/visibility resync would revert edits that hadn't finished
  // their debounced save yet.
  const fetchActiveList = useCallback(async (id: string, refresh = false, silent = false) => {
    if (!refresh && !silent) { setLoadingItems(true); }
    if (!refresh) { isFirstLoad.current = true; }
    try {
      const res = await fetch(`/api/shopping-lists?id=${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      if (!isShoppingListDetail(data)) throw new Error('load failed');
      const { list: folded } = migrateShoppingListShape({
        items: data.items ?? [],
        custom_items: data.custom_items,
        checked_state: data.checked_state,
        item_overrides: data.item_overrides,
        item_order: data.item_order,
      });
      setServerItems(folded.items as ShoppingItem[]);
      setRecipeSources(mergeRecipeSourceMaps(
        recipeSourceMapFromItems(folded.items ?? []),
        data.recipe_sources,
      ));

      // Don't clobber local state while we have unconfirmed ops in flight — the
      // DB may not reflect them yet. Once the queue drains, a later resync (or
      // the list-changed that our ops trigger) adopts the merged truth.
      const busy = pendingOps.current > 0;

      const order = data.category_order && data.category_order.length > 0
        ? data.category_order
        : CATEGORY_ORDER.filter((c: string) => (folded.items ?? []).some((i: ShoppingItem) => i.category === c));
      if (!busy) {
        setItemOverrides((folded.item_overrides ?? data.item_overrides ?? {}) as Record<string, ItemOverride>);
        setCategoryLabels(data.category_labels ?? {});
        setItemOrder(folded.item_order ?? data.item_order ?? {});
        setCategoryOrder(order);
      }

      // subtitle is debounced, so guard it with its own signature
      const dbSub = data.subtitle ?? '';
      const subUnsaved = JSON.stringify(subtitleRef.current) !== lastSubtitleSig.current;
      if (!subUnsaved) { setSubtitle(dbSub); lastSubtitleSig.current = JSON.stringify(dbSub); }

      // checked: the DB row is source of truth, including after a structural
      // refetch (live deltas can miss). Skip only while local ops are in flight.
      const nextChecked = adoptCheckedState(data);
      if (nextChecked !== undefined && shouldAdoptCheckedState({ busy })) {
        setChecked(nextChecked);
      }

      isFirstLoad.current = false;
    } catch { if (!silent) showToast('Failed to load list', 'error'); }
    finally { if (!refresh && !silent) setLoadingItems(false); }
  }, []);

  useEffect(() => { if (activeId) fetchActiveList(activeId); }, [activeId]);

  // ── Auto-save edits ───────────────────────────────────────────────────────

  // Subtitle is the only debounced edit left (it's typed char-by-char). Send it
  // as a setSubtitle op once typing settles. Structural and checked edits are
  // sent immediately as ops by their handlers.
  useEffect(() => {
    if (!activeId) return;
    const sig = JSON.stringify(subtitle);
    if (sig === lastSubtitleSig.current) return;
    const t = setTimeout(() => {
      sendOps([{ t: 'setSubtitle', subtitle }]);
      lastSubtitleSig.current = sig;
    }, 600);
    return () => clearTimeout(t);
  }, [subtitle, activeId, sendOps]);

  useEffect(() => {
    if (editingCat && catInputRef.current) { catInputRef.current.focus(); catInputRef.current.select(); }
  }, [editingCat]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const getResolvedItems = (): ResolvedItem[] => {
    const results: ResolvedItem[] = [];
    for (const si of serverItems) {
      if (si.custom) {
        const parentKey = si.id ?? si.name;
        const ov = itemOverrides[parentKey] || {};
        if (ov.hidden) continue;
        results.push({
          key: parentKey,
          displayName: ov.displayName ?? si.displayName ?? si.name,
          displayAmount: ov.displayAmount ?? (si.totalAmount ? `${si.totalAmount}${si.unit ? ' ' + si.unit : ''}` : ''),
          resolvedCategory: ov.category ?? si.category,
          isCustom: true,
        });
        continue;
      }
      const parentKey = si.id ?? si.name;
      // Give each contribution a stable id (deterministic from the parent id +
      // index, so it survives reloads without storing extra data).
      const contribs: ResolvedContribution[] = (si.contributions ?? []).map((c, i) => ({ ...c, id: `${parentKey}#${i}` }));
      const remaining = contribs.filter(c => !itemOverrides[c.id]?.detached && !itemOverrides[c.id]?.hidden);
      const detachedHere = contribs.filter(c => itemOverrides[c.id]?.detached);

      // The group itself (unless every contribution has been detached away).
      const ov = itemOverrides[parentKey] || {};
      if (!ov.hidden && remaining.length > 0) {
        // Headline name/amount reflect only the contributions still in the group.
        const distinct = [...new Set(remaining.map(c => c.name).filter(Boolean))];
        const fallbackName = distinct.length === 1 ? distinct[0] : (si.displayName ?? si.name);
        const rawAmount = remaining.length !== contribs.length
          ? amountString(aggregateContributions(remaining))   // recompute since the set shrank (detach or delete)
          : (si.totalAmount ? `${si.totalAmount}${si.unit ? ' ' + si.unit : ''}` : '');
        results.push({
          key: parentKey,
          displayName: ov.displayName ?? fallbackName,
          displayAmount: ov.displayAmount ?? rawAmount,
          resolvedCategory: ov.category ?? si.category,
          isCustom: false,
          originalServerName: si.name,
          recipes: [...new Set(remaining.map(c => c.recipe).filter(Boolean))],
          contributions: remaining,
        });
      }

      // Each detached contribution becomes its own standalone item.
      for (const c of detachedHere) {
        const cov = itemOverrides[c.id] || {};
        if (cov.hidden) continue;
        results.push({
          key: c.id,
          displayName: cov.displayName ?? c.name,
          displayAmount: cov.displayAmount ?? amountString(aggregateContributions([c])),
          resolvedCategory: cov.category ?? si.category,
          isCustom: false,
          originalServerName: si.name,
          recipes: c.recipe ? [c.recipe] : [],
          isDetached: true,
        });
      }
    }
    return results;
  };

  // Format an aggregate { totalAmount, unit } into a display string.
  const amountString = (a: { totalAmount: string; unit: string }) =>
    a.totalAmount ? `${a.totalAmount}${a.unit ? ' ' + a.unit : ''}` : '';

  const resolvedItems = getResolvedItems();
  keyToNameRef.current = Object.fromEntries(resolvedItems.map(i => [i.key, i.displayName]));
  resolvedRef.current = resolvedItems;
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
  const checkedCount = allItemKeys.filter(k => checked[k]).length;
  const totalCount = allItemKeys.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // ── Toggle ────────────────────────────────────────────────────────────────

  const toggleItem = (item: ResolvedItem) => {
    const key = item.key; const isNowChecked = !checked[key];
    setChecked(prev => { const next = { ...prev }; if (isNowChecked) next[key] = true; else delete next[key]; return next; });
    setServerItems(prev => prev.map(si => {
      const id = si.id ?? si.name;
      if (id === key) return { ...si, checked: isNowChecked };
      if (key.startsWith(`${id}#`)) {
        const index = Number(key.slice(id.length + 1));
        const contributions = (si.contributions ?? []).map((c, i) => (
          i === index ? { ...c, checked: isNowChecked } : c
        ));
        return { ...si, contributions };
      }
      return si;
    }));
    // Live delta to other clients for instant feedback. Shopper name is toast-only.
    socketRef.current?.emit('check-item', { listId: activeId, itemName: key, checked: isNowChecked, checkedBy: shopperName });
    sendOps([{ t: 'check', key, checked: isNowChecked }]);
  };
  const clearAll = () => {
    setChecked({});
    setServerItems(prev => prev.map(si => ({
      ...si,
      checked: false,
      contributions: (si.contributions ?? []).map(c => ({ ...c, checked: false })),
    })));
    socketRef.current?.emit('clear-all', { listId: activeId });
    sendOps([{ t: 'clearChecked' }]);
  };

  // ── Edits ─────────────────────────────────────────────────────────────────

  const updateItemName = (item: ResolvedItem, val: string) => {
    if (!val) return;
    if (item.isCustom) {
      setServerItems(prev => prev.map(si => si.id === item.key ? { ...si, displayName: val, name: val } : si));
      sendOps([{ t: 'updateCustom', id: item.key, patch: { displayName: val, name: val } }]);
    }
    else { setItemOverrides(prev => ({ ...prev, [item.key]: { ...prev[item.key], displayName: val } })); sendOps([{ t: 'override', key: item.key, patch: { displayName: val } }]); }
  };
  const updateItemAmount = (item: ResolvedItem, val: string) => {
    if (item.isCustom) {
      setServerItems(prev => prev.map(si => si.id === item.key ? { ...si, totalAmount: val } : si));
      sendOps([{ t: 'updateCustom', id: item.key, patch: { totalAmount: val } }]);
    }
    else { setItemOverrides(prev => ({ ...prev, [item.key]: { ...prev[item.key], displayAmount: val } })); sendOps([{ t: 'override', key: item.key, patch: { displayAmount: val } }]); }
  };
  const deleteItem = (item: ResolvedItem) => {
    const ops: ShoppingOp[] = [];
    if (item.isCustom) {
      setServerItems(prev => prev.filter(si => si.id !== item.key));
      ops.push({ t: 'removeCustom', id: item.key });
    }
    else { setItemOverrides(prev => ({ ...prev, [item.key]: { ...prev[item.key], hidden: true } })); ops.push({ t: 'override', key: item.key, patch: { hidden: true } }); }
    if (checked[item.key]) socketRef.current?.emit('check-item', { listId: activeId, itemName: item.key, checked: false, checkedBy: shopperName });
    setChecked(prev => { const n = { ...prev }; delete n[item.key]; return n; });
    ops.push({ t: 'check', key: item.key, checked: false });
    sendOps(ops);
  };

  const addItem = (cat: string, name: string, amount: string, afterKey: string | null) => {
    const id = genId();
    const item: ShoppingItem = {
      id,
      name,
      displayName: name,
      totalAmount: amount,
      unit: '',
      recipes: [],
      contributions: [],
      category: cat,
      checked: false,
      custom: true,
    };
    setServerItems(prev => [...prev, item]);

    const ops: ShoppingOp[] = [{ t: 'addCustom', item: item as unknown as Record<string, unknown> }];

    const catExists = categoryOrder.includes(cat);
    if (!catExists) { setCategoryOrder(prev => prev.includes(cat) ? prev : [...prev, cat]); ops.push({ t: 'setCategoryOrder', order: [...categoryOrder, cat] }); }

    const current = (itemOrder[cat] ?? getItemsForCat(cat).map(i => i.key));
    let nextOrder: string[];
    if (afterKey === null) nextOrder = [...current, id];
    else { const idx = current.indexOf(afterKey); nextOrder = [...current]; nextOrder.splice(idx < 0 ? current.length : idx + 1, 0, id); }
    setItemOrder(prev => ({ ...prev, [cat]: nextOrder }));
    ops.push({ t: 'setItemOrder', cat, order: nextOrder });

    sendOps(ops);
  };

  const commitEditCat = () => {
    if (!editingCat) return;
    const trimmed = editingCatValue.trim();
    if (trimmed) { setCategoryLabels(prev => ({ ...prev, [editingCat]: trimmed })); sendOps([{ t: 'setLabel', cat: editingCat, label: trimmed }]); }
    else { setCategoryLabels(prev => { const n = { ...prev }; delete n[editingCat!]; return n; }); sendOps([{ t: 'setLabel', cat: editingCat, label: null }]); }
    setEditingCat(null);
  };
  const commitAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) { setShowAddCategory(false); return; }
    setCategoryLabels(prev => ({ ...prev, [trimmed]: trimmed }));
    setCategoryOrder(prev => [...prev, trimmed]);
    sendOps([{ t: 'setLabel', cat: trimmed, label: trimmed }, { t: 'setCategoryOrder', order: [...categoryOrder, trimmed] }]);
    setShowAddCategory(false); setNewCategoryName(''); setInsertingIn({ cat: trimmed, afterKey: null });
  };

  // ── Drag ──────────────────────────────────────────────────────────────────

  const handleCatDragStart = (e: React.DragEvent, cat: string) => { e.stopPropagation(); setDragCat(cat); setDragItem(null); e.dataTransfer.effectAllowed = 'move'; };
  const handleCatDragOver = (e: React.DragEvent, cat: string) => { if (!dragCat || dragCat === cat) return; e.preventDefault(); e.stopPropagation(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setDropCat({ key: cat, position: e.clientY < rect.top + rect.height / 2 ? 'before' : 'after' }); };
  const handleCatDrop = (e: React.DragEvent, cat: string) => { e.preventDefault(); e.stopPropagation(); if (!dragCat || dragCat === cat) { resetDrag(); return; } const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'; const order = categoryOrder.length > 0 ? [...categoryOrder] : [...orderedCats]; const fromIdx = order.indexOf(dragCat); if (fromIdx === -1) { resetDrag(); return; } const next = [...order]; next.splice(fromIdx, 1); const insertAt = next.indexOf(cat) + (pos === 'after' ? 1 : 0); next.splice(insertAt, 0, dragCat); setCategoryOrder(next); sendOps([{ t: 'setCategoryOrder', order: next }]); resetDrag(); };
  const handleItemDragStart = (e: React.DragEvent, itemKey: string) => { e.stopPropagation(); setDragItem(itemKey); setDragCat(null); pendingDetachRef.current = null; e.dataTransfer.effectAllowed = 'move'; };
  // Dragging a sub-line: treat it as an item drag of its contribution id, and
  // flag it so the drop completes the detach into a standalone item.
  const handleSubDragStart = (e: React.DragEvent, contribId: string) => { e.stopPropagation(); setDragItem(contribId); setDragCat(null); pendingDetachRef.current = contribId; e.dataTransfer.effectAllowed = 'move'; };
  const handleItemDragOverItem = (e: React.DragEvent, itemKey: string) => { if (!dragItem || dragItem === itemKey) return; e.preventDefault(); e.stopPropagation(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setDropItemTarget({ key: itemKey, position: e.clientY < rect.top + rect.height / 2 ? 'before' : 'after' }); setDropItemCat(null); };
  const handleItemDropOnItem = (e: React.DragEvent, targetKey: string, targetCat: string) => { e.preventDefault(); e.stopPropagation(); if (!dragItem || dragItem === targetKey) { resetDrag(); return; } const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'; const moved = dragItem; moveItemToCategory(moved, targetCat); const catItems = getItemsForCat(targetCat).map(i => i.key).filter(k => k !== moved); const insertAt = catItems.indexOf(targetKey) + (pos === 'after' ? 1 : 0); catItems.splice(insertAt, 0, moved); setItemOrder(prev => ({ ...prev, [targetCat]: catItems })); sendOps([{ t: 'setItemOrder', cat: targetCat, order: catItems }]); resetDrag(); };
  const handleItemDropOnCat = (e: React.DragEvent, cat: string) => { e.preventDefault(); e.stopPropagation(); if (!dragItem) { resetDrag(); return; } moveItemToCategory(dragItem, cat); resetDrag(); };

  const moveItemToCategory = (itemKey: string, newCat: string, forceDetach = false) => {
    const ops: ShoppingOp[] = [];
    const detaching = (forceDetach || pendingDetachRef.current === itemKey) && !itemOverrides[itemKey]?.detached;

    // Work out the standardised name + previous category for the save-preference
    // prompt, before any state changes.
    let normName = '';
    let label = '';
    let oldCat = '';
    if (detaching) {
      const parentKey = itemKey.split('#')[0];
      const si = serverItems.find(s => (s.id ?? s.name) === parentKey);
      normName = si?.name ?? '';
      oldCat = itemOverrides[parentKey]?.category ?? si?.category ?? '';
      const idx = Number(itemKey.split('#')[1]);
      label = si?.contributions?.[idx]?.name ?? normName;
    } else {
      const item = resolvedRef.current.find(i => i.key === itemKey);
      label = item?.displayName ?? '';
      oldCat = item?.resolvedCategory ?? '';
      normName = item?.isCustom ? normalizeIngredientName(item.displayName) : (item?.originalServerName ?? '');
    }

    const custom = serverItems.find(s => s.custom && (s.id ?? s.name) === itemKey);
    if (custom) {
      setServerItems(prev => prev.map(s => s.id === itemKey ? { ...s, category: newCat } : s));
      ops.push({ t: 'updateCustom', id: itemKey, patch: { category: newCat } });
    } else {
      // Detaching is just another field on the item's override: { detached, category }.
      const patch = detaching ? { category: newCat, detached: true } : { category: newCat };
      setItemOverrides(prev => ({ ...prev, [itemKey]: { ...prev[itemKey], ...patch } }));
      ops.push({ t: 'override', key: itemKey, patch });
    }
    if (!categoryOrder.includes(newCat)) { setCategoryOrder(prev => prev.includes(newCat) ? prev : [...prev, newCat]); ops.push({ t: 'setCategoryOrder', order: [...categoryOrder, newCat] }); }
    sendOps(ops);

    pendingDetachRef.current = null;

    // Offer to remember this category for future lists — but not for the act of
    // detaching itself (that's separating one instance, not a general rule).
    if (!detaching && normName && newCat && oldCat && newCat !== oldCat) {
      maybeSaveCategoryPref(normName, label || normName, newCat);
    }
  };
  const resetDrag = () => { setDragCat(null); setDragItem(null); setDropCat(null); setDropItemTarget(null); setDropItemCat(null); pendingDetachRef.current = null; };

  // ── Click-to-move menu (alternative to dragging across a long page) ──────────
  const [moveMenu, setMoveMenu] = useState<{ key: string; isSubLine: boolean; currentCat: string; x: number; y: number; up: boolean } | null>(null);
  const openMoveMenu = (e: React.MouseEvent, key: string, isSubLine: boolean, currentCat: string) => {
    e.preventDefault(); e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Flip the menu above the button when it's in the lower part of the viewport.
    const up = rect.bottom > window.innerHeight * 0.6;
    setMoveMenu({ key, isSubLine, currentCat, x: rect.left, y: up ? rect.top : rect.bottom, up });
  };
  const doMove = (cat: string) => {
    if (!moveMenu) return;
    const { key, isSubLine, currentCat } = moveMenu;
    setMoveMenu(null);
    if (cat === currentCat && !isSubLine) return; // no-op
    moveItemToCategory(key, cat, isSubLine);
  };
  // Delete from the menu. For a sub-line that's still in a group we synthesise a
  // minimal item; deleteItem then hides it (the group recomputes without it).
  const doDelete = () => {
    if (!moveMenu) return;
    const { key } = moveMenu;
    setMoveMenu(null);
    const item = resolvedRef.current.find(i => i.key === key) ?? ({ key, isCustom: false } as ResolvedItem);
    deleteItem(item);
  };
  useEffect(() => {
    if (!moveMenu) return;
    const close = () => setMoveMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoveMenu(null); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); window.removeEventListener('keydown', onKey); };
  }, [moveMenu]);

  // ── Save-category preference ────────────────────────────────────────────────
  const persistCategoryPref = async (name: string, category: string) => {
    try {
      await fetch('/api/ingredient-categories', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category }),
      });
      showToast(`Saved — future lists will put ${name} in ${category}`, 'success');
    } catch { showToast('Couldn\u2019t save that preference', 'error'); }
  };
  const setPrefModeAndPersist = (mode: 'ask' | 'always' | 'never') => {
    setPrefMode(mode);
    fetch('/api/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryPrefMode: mode }) }).catch(() => {});
  };
  const maybeSaveCategoryPref = (name: string, label: string, category: string) => {
    if (prefMode === 'never') return;
    if (prefMode === 'always') { persistCategoryPref(name, category); return; }
    setPendingPref({ name, label, category });
  };

  // ── Delete list ───────────────────────────────────────────────────────────

  const handleDeleteList = async () => {
    if (!activeId) return;
    if (!confirm('Delete this shopping list?')) return;
    try {
      await fetch(`/api/shopping-lists?id=${activeId}`, { method: 'DELETE' });
      const remaining = lists.filter(l => l.id !== activeId);
      setLists(remaining);
      setActiveId(remaining[0]?.id ?? null);
      if (!remaining.length) { setServerItems([]); setChecked({}); }
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleCopy = async () => {
    const lines: string[] = [];
    for (const cat of orderedCats) {
      const catItems = getItemsForCat(cat).filter(i => !checked[i.key]);
      if (!catItems.length) continue;
      lines.push(`\n${getCatLabel(cat)}`);
      catItems.forEach(i => lines.push(`  □ ${i.displayName}${i.displayAmount ? ' — ' + i.displayAmount : ''}`));
    }
    await navigator.clipboard.writeText(lines.join('\n').trim());
    showToast('Copied!', 'success');
  };

  const isEmpty = !loadingItems && serverItems.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shopping <em>List</em></h1>
        </div>
        <div className="page-header-actions" style={{ gap: '0.5rem' }}>
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
          <p className="edit-hint no-print">Click to edit · <kbd>Enter</kbd> adds item · <kbd>Tab</kbd> jumps to qty · Drag to reorder · Use the <kbd>›</kbd> button (or drag) to move an item to another aisle</p>

          {pendingPref && (
            <div className="cat-pref-prompt no-print" role="dialog" aria-live="polite">
              <div className="cat-pref-text">
                Remember <strong>{pendingPref.label}</strong> belongs in <strong>{pendingPref.category}</strong>? Future lists will sort it there.
              </div>
              <label className="cat-pref-dontask">
                <input type="checkbox" checked={prefDontAsk} onChange={e => setPrefDontAsk(e.target.checked)} />
                Don’t ask again
              </label>
              <div className="cat-pref-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => { if (prefDontAsk) setPrefModeAndPersist('never'); setPendingPref(null); setPrefDontAsk(false); }}>Not now</button>
                <button className="btn btn-primary btn-sm" onClick={() => { persistCategoryPref(pendingPref.name, pendingPref.category); if (prefDontAsk) setPrefModeAndPersist('always'); setPendingPref(null); setPrefDontAsk(false); }}>Save preference</button>
              </div>
            </div>
          )}

          {orderedCats.map(cat => {
            const catItems = getItemsForCat(cat);
            if (!catItems.length && insertingIn?.cat !== cat) return null;
            const checkedCat = catItems.filter(i => checked[i.key]);
            const visibleItems = hideChecked ? catItems.filter(i => !checked[i.key]) : catItems;
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
                        item={item} isChecked={!!checked[item.key]}
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
                        onSubDragStart={handleSubDragStart}
                        onSubDragEnd={resetDrag}
                        onMoveClick={e => openMoveMenu(e, item.key, false, cat)}
                        onSubMoveClick={(e, cid) => openMoveMenu(e, cid, true, cat)}
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
                <button className="bottom-btn" onClick={() => { const cat = orderedCats[orderedCats.length - 1] || 'Other'; if (!categoryOrder.includes(cat)) { const next = [...categoryOrder, cat]; setCategoryOrder(next); sendOps([{ t: 'setCategoryOrder', order: next }]); } setInsertingIn({ cat, afterKey: null }); }}>
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

      {moveMenu && (
        <>
          <div className="move-menu-backdrop no-print" onClick={() => setMoveMenu(null)} />
          <div
            className={`move-menu no-print ${moveMenu.up ? 'is-up' : ''}`}
            style={{ left: Math.min(moveMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 196), top: moveMenu.y }}
            role="menu"
          >
            <div className="move-menu-title">{moveMenu.isSubLine ? 'Split out into…' : 'Move to…'}</div>
            {[...new Set([...orderedCats, ...CATEGORY_ORDER])].map(cat => {
              const isCurrent = cat === moveMenu.currentCat && !moveMenu.isSubLine;
              return (
                <button key={cat} className={`move-menu-item ${isCurrent ? 'is-current' : ''}`} onClick={() => doMove(cat)} role="menuitem">
                  <span className="move-menu-emoji">{CATEGORY_EMOJI[cat] || '🛒'}</span>
                  <span className="move-menu-label">{categoryLabels[cat] || cat}</span>
                  {isCurrent && <span className="move-menu-check">✓</span>}
                </button>
              );
            })}
            <div className="move-menu-sep" />
            <button className="move-menu-item move-menu-delete" onClick={doDelete} role="menuitem">
              <span className="move-menu-emoji"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6"/></svg></span>
              <span className="move-menu-label">{moveMenu.isSubLine ? 'Delete this entry' : 'Delete item'}</span>
            </button>
          </div>
        </>
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
        .shop-item { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.45rem 0.35rem; border-radius: 5px; border-bottom: 1px solid var(--parchment); transition: background 0.1s; }
        .shop-item:hover { background: var(--parchment); }
        .shop-item.is-checked { opacity: 0.42; }
        .item-drag-handle { cursor: grab; color: var(--border); display: flex; align-items: center; flex-shrink: 0; padding: 2px; margin-top: 4px; border-radius: 3px; transition: color 0.15s; }
        .item-drag-handle:hover { color: var(--ink-muted); }
        .shop-checkbox { width: 20px; height: 20px; border: 1.5px solid var(--border); border-radius: 5px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; background: white; cursor: pointer; margin-top: 2px; }
        .shop-item.is-checked .shop-checkbox { background: var(--sage); border-color: var(--sage); }
        .shop-checkbox svg { display: none; }
        .shop-item.is-checked .shop-checkbox svg { display: block; }
        .shop-item-name-wrap { flex: 1; min-width: 0; }
        .recipe-source-bar { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 3px; margin-bottom: 2px; }
        .recipe-source-pip { box-sizing: border-box; display: inline-block; width: fit-content; max-width: 100%; font-size: 0.58rem; color: var(--ink-muted); background: var(--parchment); border: 1px solid var(--border); border-radius: 3px; padding: 1px 5px; white-space: normal; overflow-wrap: anywhere; line-height: 1.4; font-style: italic; }
        a.recipe-source-link { display: inline-block; text-decoration: none; cursor: pointer; transition: color 0.12s, border-color 0.12s, background 0.12s; }
        a.recipe-source-link:hover { color: var(--rust); border-color: var(--rust); background: rgba(181,69,27,0.06); }

        /* Merged-item sub-lines: recipe pill above the original wording,
           indented to line up under the item name. Kept deliberately quiet. */
        .shop-subitems { display: flex; flex-direction: column; gap: 4px; padding: 1px 0 5px calc(0.35rem + 11px + 0.5rem + 20px); }
        .shop-subitems.is-checked { opacity: 0.42; }
        .shop-subitem { display: flex; align-items: flex-start; gap: 0.45rem; padding: 1px 0; line-height: 1.4; }
        .shop-subitem-handle { display: flex; align-items: center; color: var(--ink-muted); opacity: 0; cursor: grab; flex-shrink: 0; transition: opacity 0.12s; touch-action: none; margin-top: 2px; }
        .shop-subitem:hover .shop-subitem-handle { opacity: 0.5; }
        .shop-subitem-handle:hover { opacity: 0.9 !important; }
        .shop-subitem-handle.is-disabled { cursor: default; opacity: 0 !important; }
        .shop-subitem-handle:active { cursor: grabbing; }
        .shop-subitem-body { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 1px; }
        .shop-subitem-line { display: flex; align-items: flex-start; gap: 0.45rem; width: 100%; }
        .shop-subitem-name { font-size: 0.8rem; color: var(--ink-soft); flex: 1; min-width: 0; white-space: normal; overflow-wrap: anywhere; }
        .shop-subitem-amount { font-family: var(--font-display); font-size: 0.8rem; color: var(--rust); white-space: nowrap; flex-shrink: 0; opacity: 0.85; }

        /* "Save this category?" prompt after a drag to a new aisle. */
        .cat-pref-prompt { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.9rem; max-width: 700px; margin: 0 0 1rem; padding: 0.7rem 0.9rem; background: var(--sage-light); border: 1px solid var(--sage); border-radius: var(--radius); box-shadow: var(--shadow); animation: catPrefIn 0.18s ease-out; }
        @keyframes catPrefIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        .cat-pref-text { flex: 1; min-width: 220px; font-size: 0.85rem; color: var(--ink-soft); line-height: 1.45; }
        .cat-pref-text strong { color: var(--ink); text-transform: capitalize; }
        .cat-pref-dontask { display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: var(--ink-muted); cursor: pointer; white-space: nowrap; }
        .cat-pref-dontask input { accent-color: var(--sage); cursor: pointer; }
        .cat-pref-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }
        .btn.toggle-on { background: var(--sage-light); border-color: var(--sage); color: var(--sage); }
        .all-done { display: flex; align-items: center; gap: 0.75rem; padding: 1.25rem; background: var(--sage-light); border: 1px solid #cdd6c3; border-radius: 10px; margin: 1rem 0; }
        .all-done-emoji { font-size: 1.5rem; }
        .all-done strong { display: block; color: var(--sage); font-size: 0.95rem; margin-bottom: 2px; }
        .shop-item-name { font-size: clamp(16px, 0.9rem, 18px); color: var(--ink); display: block; border-radius: 3px; padding: 2px 4px; margin: -2px -4px; outline: none; transition: background 0.12s, box-shadow 0.12s; cursor: text; white-space: normal; overflow: visible; overflow-wrap: anywhere; line-height: 1.35; }
        .shop-item-name.checked-text { text-decoration: line-through; }
        .shop-item-name[contenteditable="true"]:hover { background: rgba(181,69,27,0.06); }
        .shop-item-name[contenteditable="true"]:focus { background: white; box-shadow: 0 0 0 1.5px var(--rust); }
        .shop-item-amount-wrap { flex-shrink: 0; padding-top: 1px; }
        .shop-item-amount { font-family: var(--font-display); font-size: clamp(16px, 0.95rem, 18px); color: var(--rust); white-space: nowrap; display: block; border-radius: 3px; padding: 2px 5px; margin: -2px -5px; outline: none; min-width: 28px; text-align: right; transition: background 0.12s, box-shadow 0.12s; cursor: text; }
        .shop-item-amount[contenteditable="true"]:empty::before { content: attr(data-placeholder); color: var(--border); font-family: var(--font-body); font-size: 0.78rem; }
        .shop-item-amount[contenteditable="true"]:hover { background: rgba(181,69,27,0.06); }
        .shop-item-amount[contenteditable="true"]:focus { background: white; box-shadow: 0 0 0 1.5px var(--rust); }
        .shop-item-checker { font-size: 0.68rem; color: var(--ink-muted); font-style: italic; white-space: nowrap; flex-shrink: 0; }
        .item-delete-btn { background: none; border: none; color: var(--border); cursor: pointer; padding: 3px; display: flex; align-items: center; flex-shrink: 0; border-radius: 4px; transition: all 0.15s; opacity: 0; margin-top: 1px; }
        .shop-item:hover .item-delete-btn { opacity: 1; }
        .item-delete-btn:hover { color: var(--rust); background: rgba(181,69,27,0.08); }

        /* Move-to-aisle: kept visible (incl. on mobile) since it replaces a long drag. */
        .item-move-btn { background: none; border: none; color: var(--ink-muted); cursor: pointer; padding: 3px; display: flex; align-items: center; flex-shrink: 0; border-radius: 4px; transition: all 0.15s; opacity: 0.5; margin-top: 1px; }
        .shop-item:hover .item-move-btn { opacity: 0.8; }
        .item-move-btn:hover { color: var(--rust); background: rgba(181,69,27,0.08); opacity: 1; }

        .move-menu-backdrop { position: fixed; inset: 0; z-index: 60; }
        .move-menu { position: fixed; z-index: 61; min-width: 178px; max-width: 78vw; max-height: 56vh; overflow-y: auto; background: white; border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 8px 28px rgba(60,42,30,0.18); padding: 4px; animation: moveMenuIn 0.12s ease-out; }
        .move-menu.is-up { transform: translateY(-100%); }
        @keyframes moveMenuIn { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; } }
        .move-menu.is-up { animation: none; }
        .move-menu-title { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-muted); padding: 5px 8px 6px; }
        .move-menu-item { display: flex; align-items: center; gap: 0.55rem; width: 100%; padding: 0.5rem 0.6rem; background: none; border: none; border-radius: 6px; font-family: var(--font-body); font-size: 0.85rem; color: var(--ink); cursor: pointer; text-align: left; transition: background 0.1s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .move-menu-item:hover { background: var(--parchment); }
        .move-menu-item:active { background: var(--border); }
        .move-menu-item.is-current { color: var(--ink-muted); cursor: default; }
        .move-menu-emoji { font-size: 0.95rem; flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 18px; }
        .move-menu-label { flex: 1; text-transform: capitalize; min-width: 0; }
        .move-menu-check { color: var(--sage); font-weight: 700; flex-shrink: 0; }
        .move-menu-sep { height: 1px; background: var(--border); margin: 4px 6px; }
        .move-menu-delete { color: var(--rust); }
        .move-menu-delete:hover { background: rgba(181,69,27,0.08); }
        .item-move-btn, .item-delete-btn { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }

        @media (max-width: 600px) {
          .move-menu { min-width: 200px; max-width: 86vw; }
          .move-menu-item { padding: 0.7rem 0.7rem; font-size: 0.92rem; }
          .item-move-btn { opacity: 0.7; padding: 5px; }
        }

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

        .shop-item-name[contenteditable="true"]:focus { word-break: break-word; }

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
