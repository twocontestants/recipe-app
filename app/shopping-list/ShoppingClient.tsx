'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ShoppingItem } from '@/lib/shopping';
import { CATEGORY_ORDER, CATEGORY_EMOJI } from '@/lib/shopping';
import { showToast } from '@/components/Toast';
import { io, Socket } from 'socket.io-client';

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function formatDate(d: Date): string { return d.toISOString().split('T')[0]; }
function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
function genId() { return Math.random().toString(36).slice(2, 10); }

// ── Types ──────────────────────────────────────────────────────────────────

interface CheckedState {
  [itemKey: string]: { checked: boolean; checkedBy: string; checkedAt: number };
}

interface ItemOverride {
  displayName?: string;
  displayAmount?: string;
  category?: string;
  hidden?: boolean;
}

interface CustomItem {
  id: string;
  displayName: string;
  category: string;
  displayAmount: string;
}

interface ResolvedItem {
  key: string;
  displayName: string;
  displayAmount: string;
  resolvedCategory: string;
  isCustom: boolean;
  originalServerName?: string;
  recipes?: string[];
}

// ── Shopper name ──────────────────────────────────────────────────────────

const SHOPPER_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn'];
function getShopperName(): string {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('shopper-name') : null;
  if (stored) return stored;
  const name = SHOPPER_NAMES[Math.floor(Math.random() * SHOPPER_NAMES.length)] + ' ' + Math.floor(Math.random() * 99 + 1);
  if (typeof window !== 'undefined') localStorage.setItem('shopper-name', name);
  return name;
}

// ── Inline editable item row ───────────────────────────────────────────────

interface ItemRowProps {
  item: ResolvedItem;
  isChecked: boolean;
  checkedBy?: string;
  isDragging: boolean;
  isDropBefore: boolean;
  isDropAfter: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onNameChange: (val: string) => void;
  onAmountChange: (val: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOverItem: (e: React.DragEvent) => void;
  onDropOnItem: (e: React.DragEvent) => void;
  onEnterAtEnd: () => void;
  recipes?: string[];
}

function ItemRow({
  item, isChecked, checkedBy, isDragging, isDropBefore, isDropAfter,
  onToggle, onDelete, onNameChange, onAmountChange,
  onDragStart, onDragEnd, onDragOverItem, onDropOnItem, onEnterAtEnd, recipes,
}: ItemRowProps) {
  const nameRef = useRef<HTMLSpanElement>(null);
  const amountRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (nameRef.current && nameRef.current.textContent !== item.displayName) {
      nameRef.current.textContent = item.displayName;
    }
  }, [item.displayName]);

  useEffect(() => {
    if (amountRef.current && amountRef.current.textContent !== item.displayAmount) {
      amountRef.current.textContent = item.displayAmount;
    }
  }, [item.displayAmount]);

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = window.getSelection();
      const node = nameRef.current;
      if (sel && node) {
        const range = sel.getRangeAt(0);
        const atEnd = range.endOffset === (node.textContent?.length ?? 0);
        if (atEnd) {
          const val = node.textContent?.trim() ?? '';
          if (val) onNameChange(val);
          onEnterAtEnd();
          return;
        }
      }
      (e.currentTarget as HTMLElement).blur();
    }
    if (e.key === 'Escape') {
      if (nameRef.current) nameRef.current.textContent = item.displayName;
      (e.currentTarget as HTMLElement).blur();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      amountRef.current?.focus();
    }
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      const val = amountRef.current?.textContent?.trim() ?? '';
      onAmountChange(val);
      (e.currentTarget as HTMLElement).blur();
      if (e.key === 'Enter') onEnterAtEnd();
    }
  };

  return (
    <div
      className={`shop-item-wrap ${isDragging ? 'item-dragging' : ''} ${isDropBefore ? 'drop-before-item' : ''} ${isDropAfter ? 'drop-after-item' : ''}`}
      onDragOver={onDragOverItem}
      onDrop={onDropOnItem}
    >
      <div className={`shop-item ${isChecked ? 'is-checked' : ''}`}>
        <div
          className="item-drag-handle no-print"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="Drag to reorder or move"
        >
          <DragHandle size={11} />
        </div>

        <div className="shop-checkbox" onClick={onToggle}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <div className="shop-item-name-wrap">
          <span
            ref={nameRef}
            className={`shop-item-name ${isChecked ? 'checked-text' : ''}`}
            contentEditable={!isChecked}
            suppressContentEditableWarning
            onBlur={e => onNameChange(e.currentTarget.textContent?.trim() ?? '')}
            onKeyDown={handleNameKeyDown}
            spellCheck={false}
          />
        </div>

        {recipes && recipes.length > 0 && (
          <div className="recipe-source-bar" title={recipes.join(', ')}>
            {recipes.map((r, i) => (
              <span key={i} className="recipe-source-pip">{r}</span>
            ))}
          </div>
        )}
        <div className="shop-item-amount-wrap">
          <span
            ref={amountRef}
            className="shop-item-amount"
            contentEditable={!isChecked}
            suppressContentEditableWarning
            data-placeholder="qty"
            onBlur={e => onAmountChange(e.currentTarget.textContent?.trim() ?? '')}
            onKeyDown={handleAmountKeyDown}
            spellCheck={false}
          />
        </div>

        {isChecked && checkedBy && (
          <span className="shop-item-checker">{checkedBy}</span>
        )}

        <button
          className="item-delete-btn no-print"
          onClick={onDelete}
          title="Remove item"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Ghost new item row ─────────────────────────────────────────────────────

interface NewItemRowProps {
  autoFocus?: boolean;
  onCommit: (name: string, amount: string) => void;
  onCancel: () => void;
}

function NewItemRow({ autoFocus, onCommit, onCancel }: NewItemRowProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  const commit = () => {
    if (name.trim()) onCommit(name.trim(), amount.trim());
    else onCancel();
  };

  return (
    <div className="new-item-row">
      <div className="item-drag-handle" style={{ opacity: 0, pointerEvents: 'none' }}>
        <DragHandle size={11} />
      </div>
      <div className="shop-checkbox new-item-checkbox" />
      <input
        ref={nameRef}
        className="new-item-name"
        placeholder="New item…"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (name.trim()) {
              onCommit(name.trim(), amount.trim());
              setName('');
              setAmount('');
              nameRef.current?.focus();
            }
          }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          if (e.key === 'Tab') { e.preventDefault(); amountRef.current?.focus(); }
        }}
        onBlur={() => {
          setTimeout(() => {
            if (!amountRef.current?.matches(':focus')) commit();
          }, 100);
        }}
      />
      <input
        ref={amountRef}
        className="new-item-amount"
        placeholder="qty"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        onBlur={() => {
          setTimeout(() => {
            if (!nameRef.current?.matches(':focus')) commit();
          }, 100);
        }}
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ShoppingListClient() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [serverItems, setServerItems] = useState<ShoppingItem[]>([]);
  const [mealCount, setMealCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<CheckedState>({});
  const [connected, setConnected] = useState(false);
  const [activeShoppers, setActiveShoppers] = useState(1);
  const [shopperName] = useState<string>(() => typeof window !== 'undefined' ? getShopperName() : 'You');
  const [recentActivity, setRecentActivity] = useState<string | null>(null);

  const [itemOverrides, setItemOverrides] = useState<Record<string, ItemOverride>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({});
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [itemOrder, setItemOrder] = useState<Record<string, string[]>>({});

  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState('');
  const catInputRef = useRef<HTMLInputElement>(null);

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
  const isFirstLoad = useRef(true);
  const weekKey = formatDate(weekStart);

  useEffect(() => {
    const socket = io({ path: '/api/socketio', transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => { setConnected(true); socket.emit('join-week', weekKey); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('full-state', (state: CheckedState) => setChecked(state));
    socket.on('item-updated', ({ itemName, checked: isChecked, checkedBy }: { itemName: string; checked: boolean; checkedBy: string }) => {
      setChecked(prev => {
        const next = { ...prev };
        if (isChecked) next[itemName] = { checked: true, checkedBy, checkedAt: Date.now() };
        else delete next[itemName];
        return next;
      });
      if (checkedBy !== shopperName) {
        const msg = isChecked ? `${checkedBy} checked off ${itemName}` : `${checkedBy} unchecked ${itemName}`;
        setRecentActivity(msg);
        if (activityTimer.current) clearTimeout(activityTimer.current);
        activityTimer.current = setTimeout(() => setRecentActivity(null), 3000);
      }
    });
    socket.on('shopper-count', (count: number) => setActiveShoppers(count));
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (socketRef.current?.connected) socketRef.current.emit('join-week', weekKey);
  }, [weekKey]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shopping-list?weekStart=${weekKey}`);
      const data = await res.json();
      const items: ShoppingItem[] = data.items || [];
      setServerItems(items);
      setMealCount(data.mealCount || 0);
      // Hydrate persisted edits
      const edits = data.edits;
      if (edits) {
        setItemOverrides(edits.item_overrides ?? {});
        setCustomItems(edits.custom_items ?? []);
        setCategoryLabels(edits.category_labels ?? {});
        setItemOrder(edits.item_order ?? {});
        if (edits.checked_state && Object.keys(edits.checked_state).length > 0) {
          setChecked(edits.checked_state);
        }
        setCategoryOrder(
          edits.category_order?.length > 0
            ? edits.category_order
            : CATEGORY_ORDER.filter((c: string) => items.some((i: ShoppingItem) => i.category === c))
        );
      } else {
        setCategoryOrder(prev => {
          if (prev.length > 0) return prev;
          return CATEGORY_ORDER.filter(c => items.some(i => i.category === c));
        });
      }
      isFirstLoad.current = false;
    } catch { showToast('Failed to load shopping list', 'error'); }
    finally { setLoading(false); }
  }, [weekKey]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Auto-save edits to DB (debounced 800ms) ───────────────────────────────

  useEffect(() => {
    if (isFirstLoad.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/shopping-list?weekStart=${weekKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_overrides:  itemOverrides,
            custom_items:    customItems,
            category_labels: categoryLabels,
            category_order:  categoryOrder,
            item_order:      itemOrder,
            checked_state:   checked,
          }),
        });
      } catch {
        // Silently fail — edits still in memory
      }
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [itemOverrides, customItems, categoryLabels, categoryOrder, itemOrder, checked, weekKey]);


  useEffect(() => {
    if (editingCat && catInputRef.current) {
      catInputRef.current.focus();
      catInputRef.current.select();
    }
  }, [editingCat]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const getResolvedItems = (): ResolvedItem[] => {
    const results: ResolvedItem[] = [];
    for (const si of serverItems) {
      const ov = itemOverrides[si.name] || {};
      if (ov.hidden) continue;
      const rawAmount = si.totalAmount ? `${si.totalAmount}${si.unit ? ' ' + si.unit : ''}` : '';
      results.push({
        key: si.name,
        displayName: ov.displayName ?? si.name,
        displayAmount: ov.displayAmount ?? rawAmount,
        resolvedCategory: ov.category ?? si.category,
        isCustom: false,
        originalServerName: si.name,
        recipes: si.recipes,
      });
    }
    for (const ci of customItems) {
      results.push({
        key: ci.id,
        displayName: ci.displayName,
        displayAmount: ci.displayAmount,
        resolvedCategory: ci.category,
        isCustom: true,
      });
    }
    return results;
  };

  const resolvedItems = getResolvedItems();
  const allActiveCats = [...new Set(resolvedItems.map(i => i.resolvedCategory))];
  const orderedCats = [
    ...categoryOrder.filter(c => allActiveCats.includes(c)),
    ...allActiveCats.filter(c => !categoryOrder.includes(c)),
  ];

  const getItemsForCat = (cat: string): ResolvedItem[] => {
    const catItems = resolvedItems.filter(i => i.resolvedCategory === cat);
    const order = itemOrder[cat];
    if (!order) return catItems;
    const ordered = order.map(k => catItems.find(i => i.key === k)).filter(Boolean) as ResolvedItem[];
    const extra = catItems.filter(i => !order.includes(i.key));
    return [...ordered, ...extra];
  };

  const getCatLabel = (cat: string) => categoryLabels[cat] || cat;

  const allItemKeys = resolvedItems.map(i => i.key);
  const checkedCount = allItemKeys.filter(k => checked[k]?.checked).length;
  const totalCount = allItemKeys.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // ── Toggle ────────────────────────────────────────────────────────────────

  const toggleItem = (item: ResolvedItem) => {
    const key = item.key;
    const isNowChecked = !checked[key]?.checked;
    setChecked(prev => {
      const next = { ...prev };
      if (isNowChecked) next[key] = { checked: true, checkedBy: shopperName, checkedAt: Date.now() };
      else delete next[key];
      return next;
    });
    if (!item.isCustom && item.originalServerName) {
      socketRef.current?.emit('check-item', { weekKey, itemName: item.originalServerName, checked: isNowChecked, checkedBy: shopperName });
    }
  };

  const clearAll = () => {
    setChecked({});
    socketRef.current?.emit('clear-all', { weekKey });
  };

  // ── Item edits ────────────────────────────────────────────────────────────

  const updateItemName = (item: ResolvedItem, val: string) => {
    if (!val) return;
    if (item.isCustom) {
      setCustomItems(prev => prev.map(c => c.id === item.key ? { ...c, displayName: val } : c));
    } else {
      setItemOverrides(prev => ({ ...prev, [item.key]: { ...prev[item.key], displayName: val } }));
    }
  };

  const updateItemAmount = (item: ResolvedItem, val: string) => {
    if (item.isCustom) {
      setCustomItems(prev => prev.map(c => c.id === item.key ? { ...c, displayAmount: val } : c));
    } else {
      setItemOverrides(prev => ({ ...prev, [item.key]: { ...prev[item.key], displayAmount: val } }));
    }
  };

  const deleteItem = (item: ResolvedItem) => {
    if (item.isCustom) {
      setCustomItems(prev => prev.filter(c => c.id !== item.key));
    } else {
      setItemOverrides(prev => ({ ...prev, [item.key]: { ...prev[item.key], hidden: true } }));
    }
    setChecked(prev => { const n = { ...prev }; delete n[item.key]; return n; });
  };

  // ── Add item ──────────────────────────────────────────────────────────────

  const addItem = (cat: string, name: string, amount: string, afterKey: string | null) => {
    const id = genId();
    setCustomItems(prev => [...prev, { id, displayName: name, category: cat, displayAmount: amount }]);
    setCategoryOrder(prev => prev.includes(cat) ? prev : [...prev, cat]);
    setItemOrder(prev => {
      const current = (prev[cat] ?? getItemsForCat(cat).map(i => i.key));
      if (afterKey === null) return { ...prev, [cat]: [...current, id] };
      const idx = current.indexOf(afterKey);
      const next = [...current];
      next.splice(idx < 0 ? current.length : idx + 1, 0, id);
      return { ...prev, [cat]: next };
    });
  };

  // ── Category editing ──────────────────────────────────────────────────────

  const startEditCat = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCat(cat);
    setEditingCatValue(getCatLabel(cat));
  };

  const commitEditCat = () => {
    if (!editingCat) return;
    const trimmed = editingCatValue.trim();
    if (trimmed) setCategoryLabels(prev => ({ ...prev, [editingCat]: trimmed }));
    else setCategoryLabels(prev => { const n = { ...prev }; delete n[editingCat!]; return n; });
    setEditingCat(null);
  };

  const commitAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) { setShowAddCategory(false); return; }
    const key = trimmed;
    setCategoryLabels(prev => ({ ...prev, [key]: trimmed }));
    setCategoryOrder(prev => [...prev, key]);
    setShowAddCategory(false);
    setNewCategoryName('');
    setInsertingIn({ cat: key, afterKey: null });
  };

  // ── Drag ──────────────────────────────────────────────────────────────────

  const handleCatDragStart = (e: React.DragEvent, cat: string) => {
    e.stopPropagation(); setDragCat(cat); setDragItem(null);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleCatDragOver = (e: React.DragEvent, cat: string) => {
    if (!dragCat || dragCat === cat) return;
    e.preventDefault(); e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropCat({ key: cat, position: e.clientY < rect.top + rect.height / 2 ? 'before' : 'after' });
  };
  const handleCatDrop = (e: React.DragEvent, cat: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!dragCat || dragCat === cat) { resetDrag(); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setCategoryOrder(prev => {
      const order = prev.length > 0 ? [...prev] : [...orderedCats];
      const fromIdx = order.indexOf(dragCat);
      if (fromIdx === -1) return order;
      const next = [...order];
      next.splice(fromIdx, 1);
      const insertAt = next.indexOf(cat) + (pos === 'after' ? 1 : 0);
      next.splice(insertAt, 0, dragCat);
      return next;
    });
    resetDrag();
  };

  const handleItemDragStart = (e: React.DragEvent, itemKey: string) => {
    e.stopPropagation(); setDragItem(itemKey); setDragCat(null);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleItemDragOverItem = (e: React.DragEvent, itemKey: string) => {
    if (!dragItem || dragItem === itemKey) return;
    e.preventDefault(); e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropItemTarget({ key: itemKey, position: e.clientY < rect.top + rect.height / 2 ? 'before' : 'after' });
    setDropItemCat(null);
  };
  const handleItemDropOnItem = (e: React.DragEvent, targetKey: string, targetCat: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!dragItem || dragItem === targetKey) { resetDrag(); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    moveItemToCategory(dragItem, targetCat);
    setItemOrder(prev => {
      const catItems = getItemsForCat(targetCat).map(i => i.key).filter(k => k !== dragItem);
      const insertAt = catItems.indexOf(targetKey) + (pos === 'after' ? 1 : 0);
      catItems.splice(insertAt, 0, dragItem);
      return { ...prev, [targetCat]: catItems };
    });
    resetDrag();
  };
  const handleItemDropOnCat = (e: React.DragEvent, cat: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!dragItem) { resetDrag(); return; }
    moveItemToCategory(dragItem, cat);
    resetDrag();
  };
  const moveItemToCategory = (itemKey: string, newCat: string) => {
    const ci = customItems.find(c => c.id === itemKey);
    if (ci) setCustomItems(prev => prev.map(c => c.id === itemKey ? { ...c, category: newCat } : c));
    else setItemOverrides(prev => ({ ...prev, [itemKey]: { ...prev[itemKey], category: newCat } }));
    setCategoryOrder(prev => prev.includes(newCat) ? prev : [...prev, newCat]);
  };
  const resetDrag = () => {
    setDragCat(null); setDragItem(null);
    setDropCat(null); setDropItemTarget(null); setDropItemCat(null);
  };

  // ── Copy / print ──────────────────────────────────────────────────────────

  const prevWeek = () => setWeekStart(d => { const nd = new Date(d); nd.setDate(d.getDate() - 7); return nd; });
  const nextWeek = () => setWeekStart(d => { const nd = new Date(d); nd.setDate(d.getDate() + 7); return nd; });

  const handleCopy = async () => {
    const lines: string[] = [];
    for (const cat of orderedCats) {
      const catItems = getItemsForCat(cat).filter(i => !checked[i.key]?.checked);
      if (catItems.length === 0) continue;
      lines.push(`\n${getCatLabel(cat)}`);
      catItems.forEach(i => lines.push(`  □ ${i.displayName}${i.displayAmount ? ' — ' + i.displayAmount : ''}`));
    }
    await navigator.clipboard.writeText(lines.join('\n').trim());
    showToast('Copied to clipboard!', 'success');
  };

  const isEmpty = totalCount === 0 && !loading;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shopping <em>List</em></h1>
          <p className="page-subtitle">{totalCount} items · {mealCount} meals</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className={`socket-badge ${connected ? 'connected' : 'disconnected'}`}>
            <span className="socket-dot" />
            {connected ? `Live · ${activeShoppers} shopper${activeShoppers !== 1 ? 's' : ''}` : 'Offline'}
          </div>
          <button className="btn btn-secondary btn-sm no-print" onClick={handleCopy}>Copy</button>
          <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>Print</button>
          {checkedCount > 0 && <button className="btn btn-ghost btn-sm no-print" onClick={clearAll}>Uncheck all</button>}
          <a href="/planner" className="btn btn-primary btn-sm no-print">Edit plan →</a>
        </div>
      </div>

      <div className="week-nav no-print" style={{ marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={prevWeek}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="week-label" style={{ fontSize: '0.95rem' }}>{formatWeekLabel(weekStart)}</span>
        <button className="btn btn-secondary btn-sm" onClick={nextWeek}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(getMonday(new Date()))}>This week</button>
      </div>

      {loading ? (
        <div className="empty-state"><div className="loading-dots"><span/><span/><span/></div></div>
      ) : isEmpty ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <h3>Nothing to shop for</h3>
          <p>Plan your meals for the week first.</p>
          <br/>
          <a href="/planner" className="btn btn-primary">Go to planner →</a>
        </div>
      ) : (
        <div style={{ maxWidth: '700px' }}>
          <div className="progress-bar-wrap no-print">
            <div className="progress-bar-labels">
              <span>{checkedCount} of {totalCount} items</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {recentActivity && <div className="activity-toast no-print">{recentActivity}</div>}
          <div className="shopper-label no-print">Shopping as <strong>{shopperName}</strong></div>

          <p className="edit-hint no-print">
            Click any item to edit · <kbd>Enter</kbd> adds a new item below · <kbd>Tab</kbd> jumps to quantity · Drag <DragHandle size={9} /> to reorder
          </p>

          {orderedCats.map(cat => {
            const catItems = getItemsForCat(cat);
            if (catItems.length === 0 && insertingIn?.cat !== cat) return null;
            const checkedCat = catItems.filter(i => checked[i.key]?.checked);
            const label = getCatLabel(cat);
            const isCatDragging = dragCat === cat;
            const isDropTarget = dropCat?.key === cat;

            return (
              <div
                key={cat}
                className={`shop-category ${isCatDragging ? 'cat-dragging' : ''} ${isDropTarget ? `drop-${dropCat?.position}` : ''}`}
                onDragOver={e => {
                  if (dragCat) handleCatDragOver(e, cat);
                  else if (dragItem) { e.preventDefault(); setDropItemCat(cat); setDropItemTarget(null); }
                }}
                onDrop={e => {
                  if (dragCat) handleCatDrop(e, cat);
                  else if (dragItem) handleItemDropOnCat(e, cat);
                }}
                onDragLeave={e => {
                  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                    setDropCat(null); setDropItemCat(null);
                  }
                }}
              >
                <div className={`shop-category-header ${dropItemCat === cat && dragItem ? 'item-drop-target' : ''}`}>
                  <div className="cat-drag-handle no-print" draggable onDragStart={e => handleCatDragStart(e, cat)} onDragEnd={resetDrag} title="Drag to reorder">
                    <DragHandle size={13} />
                  </div>
                  <span className="shop-category-emoji">{CATEGORY_EMOJI[cat] || '🛒'}</span>
                  {editingCat === cat ? (
                    <input
                      ref={catInputRef}
                      className="category-edit-input"
                      value={editingCatValue}
                      onChange={e => setEditingCatValue(e.target.value)}
                      onBlur={commitEditCat}
                      onKeyDown={e => { if (e.key === 'Enter') commitEditCat(); if (e.key === 'Escape') setEditingCat(null); }}
                    />
                  ) : (
                    <button className="shop-category-name-btn" onClick={e => startEditCat(cat, e)} title="Click to rename">
                      {label}
                      <svg className="edit-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  )}
                  <span className="shop-category-count">
                    {checkedCat.length > 0 && `${checkedCat.length}/`}{catItems.length}
                  </span>
                  <button className="category-add-btn no-print" onClick={() => setInsertingIn({ cat, afterKey: null })}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    Add
                  </button>
                </div>

                <div className="shop-items">
                  {catItems.map(item => {
                    const isChecked = !!checked[item.key]?.checked;
                    return (
                      <div key={item.key}>
                        <ItemRow
                          item={item}
                          isChecked={isChecked}
                          checkedBy={checked[item.key]?.checkedBy}
                          isDragging={dragItem === item.key}
                          isDropBefore={dropItemTarget?.key === item.key && dropItemTarget.position === 'before'}
                          isDropAfter={dropItemTarget?.key === item.key && dropItemTarget.position === 'after'}
                          onToggle={() => toggleItem(item)}
                          onDelete={() => deleteItem(item)}
                          onNameChange={val => updateItemName(item, val)}
                          onAmountChange={val => updateItemAmount(item, val)}
                          onDragStart={e => handleItemDragStart(e, item.key)}
                          onDragEnd={resetDrag}
                          onDragOverItem={e => { if (dragItem) handleItemDragOverItem(e, item.key); }}
                          onDropOnItem={e => { if (dragItem) handleItemDropOnItem(e, item.key, cat); }}
                          onEnterAtEnd={() => setInsertingIn({ cat, afterKey: item.key })}
                          recipes={item.recipes}
                        />
                        {insertingIn?.cat === cat && insertingIn.afterKey === item.key && (
                          <NewItemRow
                            autoFocus
                            onCommit={(name, amount) => { addItem(cat, name, amount, item.key); setInsertingIn(null); }}
                            onCancel={() => setInsertingIn(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                  {insertingIn?.cat === cat && insertingIn.afterKey === null && (
                    <NewItemRow
                      autoFocus
                      onCommit={(name, amount) => { addItem(cat, name, amount, null); setInsertingIn(null); }}
                      onCancel={() => setInsertingIn(null)}
                    />
                  )}
                </div>
              </div>
            );
          })}

          <div className="bottom-controls no-print">
            {showAddCategory ? (
              <div className="add-cat-row">
                <input
                  autoFocus
                  className="add-cat-input"
                  placeholder="New category name…"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitAddCategory(); if (e.key === 'Escape') setShowAddCategory(false); }}
                />
                <button className="add-confirm-btn" onClick={commitAddCategory} disabled={!newCategoryName.trim()}>Create</button>
                <button className="add-cancel-btn" onClick={() => setShowAddCategory(false)}>Cancel</button>
              </div>
            ) : (
              <div className="bottom-actions">
                <button className="bottom-btn" onClick={() => {
                  const fallbackCat = orderedCats[orderedCats.length - 1] || 'Other';
                  setCategoryOrder(prev => prev.includes(fallbackCat) ? prev : [...prev, fallbackCat]);
                  setInsertingIn({ cat: fallbackCat, afterKey: null });
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Add item
                </button>
                <button className="bottom-btn" onClick={() => setShowAddCategory(true)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  New category
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .socket-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 0.72rem; padding: 0.3rem 0.65rem; border-radius: 99px; border: 1px solid var(--border); color: var(--ink-muted); }
        .socket-badge.connected { border-color: #B8DDB0; color: #3A6B31; background: #F2FAF0; }
        .socket-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse-dot 2s infinite; }
        .socket-badge.disconnected .socket-dot { animation: none; opacity: 0.4; }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        .progress-bar-wrap { margin-bottom: 1.5rem; }
        .progress-bar-labels { display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--ink-muted); margin-bottom: 0.4rem; }
        .progress-bar-track { height: 5px; background: var(--parchment); border-radius: 3px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: var(--sage); border-radius: 3px; transition: width 0.4s ease; }

        .activity-toast { background: var(--ink); color: var(--cream); font-size: 0.78rem; padding: 0.55rem 0.85rem; border-radius: 6px; margin-bottom: 1rem; }
        .shopper-label { font-size: 0.75rem; color: var(--ink-muted); margin-bottom: 0.5rem; }

        .edit-hint {
          font-size: 0.72rem; color: var(--ink-muted); margin-bottom: 1.5rem;
          display: flex; align-items: center; gap: 5px; font-style: italic; flex-wrap: wrap;
        }
        .edit-hint kbd {
          font-style: normal; background: var(--parchment); border: 1px solid var(--border);
          border-radius: 3px; padding: 0 4px; font-size: 0.68rem; font-family: var(--font-body); color: var(--ink-soft);
        }

        .shop-category { margin-bottom: 1.75rem; transition: opacity 0.15s; position: relative; }
        .shop-category.cat-dragging { opacity: 0.4; }
        .shop-category.drop-before { border-top: 2px solid var(--rust); padding-top: 4px; }
        .shop-category.drop-after { border-bottom: 2px solid var(--rust); padding-bottom: 4px; }

        .shop-category-header {
          display: flex; align-items: center; gap: 0.5rem;
          margin-bottom: 0.5rem; border-bottom: 1.5px solid var(--border);
          transition: background 0.15s; border-radius: 4px 4px 0 0;
          padding: 0.3rem 0.35rem 0.45rem;
        }
        .shop-category-header.item-drop-target { background: rgba(181,69,27,0.06); border-bottom-color: var(--rust); border-bottom-width: 2px; }

        .cat-drag-handle { cursor: grab; color: var(--border); display: flex; align-items: center; padding: 2px; border-radius: 3px; transition: color 0.15s; flex-shrink: 0; }
        .cat-drag-handle:hover { color: var(--ink-muted); }
        .cat-drag-handle:active { cursor: grabbing; }

        .shop-category-emoji { font-size: 15px; flex-shrink: 0; }

        .shop-category-name-btn {
          display: inline-flex; align-items: center; gap: 5px; background: none; border: none;
          padding: 0; cursor: pointer; font-size: 0.72rem; text-transform: uppercase;
          letter-spacing: 0.12em; color: var(--ink-soft); font-weight: 400; flex: 1;
          font-family: var(--font-body); transition: color 0.15s; border-radius: 3px;
        }
        .shop-category-name-btn:hover { color: var(--rust); }
        .edit-icon { opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }
        .shop-category-name-btn:hover .edit-icon { opacity: 1; }

        .category-edit-input {
          flex: 1; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em;
          color: var(--ink); font-family: var(--font-body); border: none;
          border-bottom: 1.5px solid var(--rust); outline: none; background: transparent; padding: 0 0 2px; min-width: 0;
        }

        .shop-category-count { font-size: 0.7rem; color: var(--ink-muted); flex-shrink: 0; }

        .category-add-btn {
          display: inline-flex; align-items: center; gap: 4px; padding: 0.2rem 0.55rem;
          background: none; border: 1px dashed var(--border); border-radius: 99px;
          font-size: 0.68rem; color: var(--ink-muted); cursor: pointer;
          font-family: var(--font-body); transition: all 0.15s; white-space: nowrap;
        }
        .category-add-btn:hover { border-color: var(--rust); color: var(--rust); }

        .shop-items { display: flex; flex-direction: column; }

        .shop-item-wrap { position: relative; }
        .shop-item-wrap.item-dragging { opacity: 0.35; }
        .shop-item-wrap.drop-before-item::before { content: ''; display: block; height: 2px; background: var(--rust); border-radius: 2px; margin-bottom: 1px; }
        .shop-item-wrap.drop-after-item::after { content: ''; display: block; height: 2px; background: var(--rust); border-radius: 2px; margin-top: 1px; }

        .shop-item {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.35rem;
          border-radius: 5px; border-bottom: 1px solid var(--parchment); transition: background 0.1s;
        }
        .shop-item:last-child { border-bottom: none; }
        .shop-item:hover { background: var(--parchment); }
        .shop-item.is-checked { opacity: 0.42; }

        .item-drag-handle { cursor: grab; color: var(--border); display: flex; align-items: center; flex-shrink: 0; padding: 2px; border-radius: 3px; transition: color 0.15s; }
        .item-drag-handle:hover { color: var(--ink-muted); }
        .item-drag-handle:active { cursor: grabbing; }

        .shop-checkbox {
          width: 20px; height: 20px; border: 1.5px solid var(--border); border-radius: 5px;
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; background: white; cursor: pointer;
        }
        .shop-item.is-checked .shop-checkbox { background: var(--sage); border-color: var(--sage); }
        .shop-checkbox svg { display: none; }
        .shop-item.is-checked .shop-checkbox svg { display: block; }

        /* Recipe source bar */
        .recipe-source-bar {
          display: flex; flex-wrap: wrap; gap: 3px; flex-shrink: 0;
          align-items: center; max-width: 140px;
        }
        .recipe-source-pip {
          font-size: 0.58rem; color: var(--ink-muted); background: var(--parchment);
          border: 1px solid var(--border); border-radius: 3px;
          padding: 1px 5px; white-space: nowrap; overflow: hidden;
          text-overflow: ellipsis; max-width: 130px; line-height: 1.4;
          font-style: italic;
        }

        /* Document-style name */
        .shop-item-name-wrap { flex: 1; min-width: 0; }
        .shop-item-name {
          font-size: 0.9rem; color: var(--ink); display: block;
          border-radius: 3px; padding: 2px 4px; margin: -2px -4px; outline: none;
          transition: background 0.12s, box-shadow 0.12s;
          cursor: text; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .shop-item-name.checked-text { text-decoration: line-through; }
        .shop-item-name[contenteditable="true"]:hover { background: rgba(181,69,27,0.06); }
        .shop-item-name[contenteditable="true"]:focus { background: white; box-shadow: 0 0 0 1.5px var(--rust); white-space: normal; overflow: visible; }

        /* Document-style amount */
        .shop-item-amount-wrap { flex-shrink: 0; }
        .shop-item-amount {
          font-family: var(--font-display); font-size: 0.95rem; color: var(--rust);
          white-space: nowrap; display: block; border-radius: 3px; padding: 2px 5px; margin: -2px -5px;
          outline: none; min-width: 28px; text-align: right;
          transition: background 0.12s, box-shadow 0.12s; cursor: text;
        }
        .shop-item-amount[contenteditable="true"]:empty::before {
          content: attr(data-placeholder); color: var(--border);
          font-family: var(--font-body); font-size: 0.78rem;
        }
        .shop-item-amount[contenteditable="true"]:hover { background: rgba(181,69,27,0.06); }
        .shop-item-amount[contenteditable="true"]:focus { background: white; box-shadow: 0 0 0 1.5px var(--rust); }

        .shop-item-checker { font-size: 0.68rem; color: var(--ink-muted); font-style: italic; white-space: nowrap; flex-shrink: 0; }

        .item-delete-btn {
          background: none; border: none; color: var(--border); cursor: pointer;
          padding: 3px; display: flex; align-items: center; flex-shrink: 0;
          border-radius: 4px; transition: all 0.15s; opacity: 0;
        }
        .shop-item:hover .item-delete-btn { opacity: 1; }
        .item-delete-btn:hover { color: var(--rust); background: rgba(181,69,27,0.08); }

        /* New item ghost row */
        .new-item-row {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.4rem 0.35rem;
          border-radius: 0 0 5px 5px;
          background: rgba(181,69,27,0.025);
          border: 1px dashed var(--border);
          border-top: none;
          animation: fadeInRow 0.12s ease;
        }
        @keyframes fadeInRow { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }

        .new-item-checkbox { opacity: 0.2; pointer-events: none; }

        .new-item-name {
          flex: 1; min-width: 0; border: none; outline: none; background: transparent;
          font-size: 0.9rem; font-family: var(--font-body); color: var(--ink); padding: 2px 4px;
        }
        .new-item-name::placeholder { color: var(--border); }

        .new-item-amount {
          width: 80px; border: none; outline: none; background: transparent;
          font-family: var(--font-display); font-size: 0.95rem; color: var(--rust);
          text-align: right; padding: 2px 5px;
        }
        .new-item-amount::placeholder { color: var(--border); font-family: var(--font-body); font-size: 0.78rem; }

        .bottom-controls { margin-top: 1rem; }
        .bottom-actions { display: flex; gap: 0.6rem; }
        .bottom-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.5rem 1rem; background: none; border: 1px dashed var(--border);
          border-radius: 6px; font-size: 0.8rem; color: var(--ink-muted); cursor: pointer;
          font-family: var(--font-body); transition: all 0.15s;
        }
        .bottom-btn:hover { border-color: var(--rust); color: var(--rust); }

        .add-cat-row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
        .add-cat-input { flex: 1; min-width: 180px; padding: 0.45rem 0.7rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.88rem; font-family: var(--font-body); color: var(--ink); outline: none; transition: border-color 0.15s; }
        .add-cat-input:focus { border-color: var(--rust); }
        .add-confirm-btn { padding: 0.38rem 0.85rem; background: var(--rust); color: white; border: none; border-radius: 5px; font-size: 0.8rem; font-family: var(--font-body); cursor: pointer; transition: opacity 0.15s; }
        .add-confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .add-confirm-btn:not(:disabled):hover { opacity: 0.85; }
        .add-cancel-btn { padding: 0.38rem 0.75rem; background: white; color: var(--ink-muted); border: 1px solid var(--border); border-radius: 5px; font-size: 0.8rem; font-family: var(--font-body); cursor: pointer; transition: all 0.15s; }
        .add-cancel-btn:hover { border-color: var(--ink-muted); color: var(--ink); }

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
      <circle cx="3" cy="3" r="1.5"/>
      <circle cx="9" cy="3" r="1.5"/>
      <circle cx="3" cy="9" r="1.5"/>
      <circle cx="9" cy="9" r="1.5"/>
      <circle cx="3" cy="15" r="1.5"/>
      <circle cx="9" cy="15" r="1.5"/>
    </svg>
  );
}
