'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type PickerDayOption = {
  index: number;
  name: string;
  dateLabel: string;
};

type Props = {
  title: string;
  thumb: React.ReactNode;
  meta?: string;
  protein?: React.ReactNode;
  currentDayIndex: number;
  days: PickerDayOption[];
  onSelect: () => void;
  onAddToDay: (dayIndex: number) => void;
  onAddToDate: (isoDate: string) => void;
};

export default function PickerRecipeRow({
  title,
  thumb,
  meta,
  protein,
  currentDayIndex,
  days,
  onSelect,
  onAddToDay,
  onAddToDate,
}: Props) {
  const [menu, setMenu] = useState<{ right: number; y: number; up: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const otherDays = days.filter(day => day.index !== currentDayIndex);

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    window.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const openDatePicker = () => {
    setMenu(null);
    const el = dateInputRef.current;
    if (!el) return;
    const open = () => {
      try {
        if (typeof el.showPicker === 'function') el.showPicker();
        else el.focus();
      } catch {
        el.focus();
      }
    };
    requestAnimationFrame(open);
  };

  return (
    <div className="pl-picker-row-wrap">
      <button type="button" className="pl-picker-row" onClick={onSelect}>
        <div className="pl-picker-thumb" aria-hidden="true">{thumb}</div>
        <div className="pl-picker-info">
          <span className="pl-picker-name">{title}</span>
          <div className="pl-picker-row-meta">
            {protein}
            {meta ? <span className="pl-picker-meta">{meta}</span> : null}
          </div>
        </div>
      </button>
      <button
        type="button"
        className="pl-picker-row-menu-btn"
        aria-label={`Add ${title} to another day`}
        aria-haspopup="menu"
        aria-expanded={!!menu}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const up = rect.bottom > window.innerHeight * 0.55;
          setMenu({
            right: window.innerWidth - rect.right,
            y: up ? rect.top - 4 : rect.bottom + 4,
            up,
          });
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7"/>
          <circle cx="12" cy="12" r="1.7"/>
          <circle cx="12" cy="19" r="1.7"/>
        </svg>
      </button>
      <input
        ref={dateInputRef}
        type="date"
        className="pl-picker-date-hidden"
        aria-label={`Pick another date for ${title}`}
        onChange={e => {
          const value = e.target.value;
          if (!value) return;
          onAddToDate(value);
          e.target.value = '';
        }}
      />
      {menu && createPortal(
        <>
          <div className="pl-picker-day-menu-backdrop" onClick={() => setMenu(null)} />
          <div
            ref={menuRef}
            className={`pl-card-menu pl-picker-day-menu ${menu.up ? 'is-up' : ''}`}
            style={{ right: menu.right, top: menu.y }}
            role="menu"
          >
            <div className="pl-card-menu-back" style={{ padding: '0.45rem 0.7rem' }}>Add to…</div>
            <div className="pl-card-menu-sep" />
            {otherDays.map(day => (
              <button
                key={day.index}
                type="button"
                className="pl-card-menu-item"
                role="menuitem"
                onClick={() => {
                  setMenu(null);
                  onAddToDay(day.index);
                }}
              >
                <span className="pl-card-menu-day">
                  <span>{day.name}</span>
                  <span className="pl-card-menu-date">{day.dateLabel}</span>
                </span>
              </button>
            ))}
            {otherDays.length > 0 && <div className="pl-card-menu-sep" />}
            <button
              type="button"
              className="pl-card-menu-item"
              role="menuitem"
              onClick={openDatePicker}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              Another date…
            </button>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
