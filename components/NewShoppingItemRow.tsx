'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ingredientSuggestions } from '@/lib/shoppingSuggest';

export const newShoppingItemRowCss = `
  .new-item-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.35rem;
    border-radius: 0 0 5px 5px;
    background: rgba(181,69,27,0.025);
    border: 1px dashed var(--border);
    border-top: none;
    animation: fadeInRow 0.12s ease;
    position: relative;
    z-index: 40;
    overflow: visible;
  }
  @keyframes fadeInRow { from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none} }
  .new-item-checkbox { opacity: 0.2; pointer-events: none; }
  .new-item-name-wrap {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
  }
  .new-item-row input.new-item-name {
    display: block;
    width: 100%;
    min-width: 0;
    margin: 0;
    border: none;
    outline: none;
    background: transparent;
    box-shadow: none;
    font-size: 16px;
    font-family: var(--font-body);
    color: var(--ink);
    padding: 2px 4px;
    border-radius: 3px;
  }
  .new-item-row input.new-item-name::placeholder { color: var(--border); }
  .new-item-row input.new-item-name:focus {
    background: white;
    box-shadow: 0 0 0 1.5px var(--rust);
    border: none;
  }
  .new-item-row input.new-item-amount {
    flex: 0 0 4.75rem;
    width: 4.75rem;
    min-width: 4.75rem;
    max-width: 4.75rem;
    margin: 0;
    border: none;
    outline: none;
    background: transparent;
    box-shadow: none;
    font-family: var(--font-display);
    font-size: 16px;
    color: var(--rust);
    text-align: right;
    padding: 2px 5px;
    border-radius: 3px;
  }
  .new-item-row input.new-item-amount::placeholder {
    color: var(--border);
    font-family: var(--font-body);
    font-size: 0.78rem;
  }
  .new-item-row input.new-item-amount:focus {
    background: white;
    box-shadow: 0 0 0 1.5px var(--rust);
    border: none;
  }
  .new-item-suggest {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% + 4px);
    z-index: 50;
    margin: 0;
    padding: 4px;
    list-style: none;
    background: white;
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 -6px 20px rgba(26,22,18,0.12);
    max-height: 220px;
    overflow-y: auto;
  }
  .new-item-suggest-option {
    display: block;
    width: 100%;
    padding: 0.5rem 0.65rem;
    background: none;
    border: none;
    border-radius: 6px;
    font-family: var(--font-body);
    font-size: 0.88rem;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  .new-item-suggest-option.is-active,
  .new-item-suggest-option:hover {
    background: var(--parchment);
  }
`;

type Props = {
  autoFocus?: boolean;
  catalog?: string[];
  onCommit: (name: string, amount: string) => void;
  onCancel: () => void;
};

export default function NewShoppingItemRow({ autoFocus, catalog = [], onCommit, onCancel }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const listId = 'new-item-suggest';

  useEffect(() => { if (autoFocus) nameRef.current?.focus(); }, [autoFocus]);

  const matches = useMemo(() => ingredientSuggestions(name, catalog), [name, catalog]);
  const showSuggest = suggestOpen && matches.length > 0;

  useEffect(() => { setHighlight(-1); }, [name]);

  const commit = () => {
    if (name.trim()) onCommit(name.trim(), amount.trim());
    else onCancel();
  };

  const acceptSuggestion = (value: string) => {
    setName(value);
    setHighlight(-1);
    setSuggestOpen(false);
    amountRef.current?.focus();
  };

  const commitUnlessOtherField = (other: HTMLInputElement | null) => {
    window.setTimeout(() => {
      if (other?.matches(':focus')) return;
      if (document.activeElement?.closest('.new-item-suggest')) return;
      commit();
    }, 100);
  };

  return (
    <>
      <style>{newShoppingItemRowCss}</style>
      <div className="new-item-row" data-layout="name-qty">
        <div className="item-drag-handle" style={{ opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
          <svg width="11" height="11" viewBox="0 0 12 18" fill="currentColor">
            <circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/>
            <circle cx="3" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/>
            <circle cx="3" cy="15" r="1.5"/><circle cx="9" cy="15" r="1.5"/>
          </svg>
        </div>
        <div className="shop-checkbox new-item-checkbox" />
        <div className="new-item-name-wrap">
          <input
            ref={nameRef}
            className="new-item-name"
            placeholder="New item…"
            value={name}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggest}
            aria-controls={listId}
            aria-activedescendant={highlight >= 0 ? `${listId}-${highlight}` : undefined}
            onChange={e => { setSuggestOpen(true); setName(e.target.value); }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown' && showSuggest) {
                e.preventDefault();
                setHighlight(i => Math.min((i < 0 ? -1 : i) + 1, matches.length - 1));
                return;
              }
              if (e.key === 'ArrowUp' && showSuggest) {
                e.preventDefault();
                setHighlight(i => (i <= 0 ? -1 : i - 1));
                return;
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                if (highlight >= 0 && matches[highlight]) {
                  acceptSuggestion(matches[highlight]);
                  return;
                }
                if (name.trim()) {
                  onCommit(name.trim(), amount.trim());
                  setName('');
                  setAmount('');
                  nameRef.current?.focus();
                }
                return;
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                if (showSuggest && highlight >= 0) { setHighlight(-1); return; }
                onCancel();
                return;
              }
              if (e.key === 'Tab') {
                e.preventDefault();
                if (highlight >= 0 && matches[highlight]) acceptSuggestion(matches[highlight]);
                else amountRef.current?.focus();
              }
            }}
            onBlur={() => commitUnlessOtherField(amountRef.current)}
          />
          {showSuggest && (
            <ul id={listId} className="new-item-suggest" role="listbox" data-placement="up">
              {matches.map((match, i) => (
                <li key={match} role="presentation">
                  <button
                    type="button"
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === highlight}
                    className={`new-item-suggest-option ${i === highlight ? 'is-active' : ''}`}
                    onMouseDown={e => e.preventDefault()}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => acceptSuggestion(match)}
                  >
                    {match}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          ref={amountRef}
          className="new-item-amount"
          placeholder="qty"
          value={amount}
          autoComplete="off"
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
          onBlur={() => commitUnlessOtherField(nameRef.current)}
        />
      </div>
    </>
  );
}
