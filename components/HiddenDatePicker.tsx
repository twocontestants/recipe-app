'use client';

import type { Ref } from 'react';

export function openNativeDatePicker(el: HTMLInputElement | null) {
  if (!el) return;
  try {
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.focus();
  } catch {
    try {
      el.focus();
    } catch { /* ignore */ }
  }
}

type Props = {
  ariaLabel: string;
  onPick: (isoDate: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
};

export default function HiddenDatePicker({
  ariaLabel,
  onPick,
  inputRef,
  className = 'pl-picker-date-hidden',
}: Props) {
  return (
    <input
      ref={inputRef}
      type="date"
      className={className}
      aria-label={ariaLabel}
      onChange={e => {
        const value = e.target.value;
        if (!value) return;
        onPick(value);
        e.target.value = '';
      }}
    />
  );
}
