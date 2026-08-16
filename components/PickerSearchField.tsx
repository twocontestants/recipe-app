'use client';

import type { Ref } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  inputRef?: Ref<HTMLInputElement>;
};

export const pickerSearchFieldCss = `
  .pl-picker-search-field {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0 0.85rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: white;
    transition: border-color 0.15s;
  }
  .pl-picker-search-field:focus-within { border-color: var(--rust); }
  .pl-picker-search-icon {
    position: static;
    flex-shrink: 0;
    color: var(--ink-muted);
    pointer-events: none;
    transform: none;
  }
  .pl-picker-search {
    flex: 1;
    min-width: 0;
    width: auto;
    padding: 0.55rem 0;
    border: none;
    border-radius: 0;
    font-size: 0.88rem;
    font-family: var(--font-body);
    color: var(--ink);
    outline: none;
    background: transparent;
    appearance: none;
    -webkit-appearance: none;
    box-sizing: border-box;
  }
  .pl-picker-search:focus { outline: none; }
`;

export default function PickerSearchField({ value, onChange, onFocus, inputRef }: Props) {
  return (
    <>
      <style>{pickerSearchFieldCss}</style>
      <div className="pl-picker-search-field" data-layout="cluster">
        <svg
          className="pl-picker-search-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          className="pl-picker-search"
          placeholder="Search recipes…"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus}
        />
      </div>
    </>
  );
}
