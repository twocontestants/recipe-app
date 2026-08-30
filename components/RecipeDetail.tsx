'use client';

import { useEffect, useState } from 'react';
import type { Recipe } from '@/lib/db';
import { ProteinBadge } from './ProteinBadge';

export function RecipeDetail({ recipe, signedIn, onEdit, onDelete, onDuplicate, onPublish, onRate, onNote, onBack, onAddToPlanner }: {
  recipe: Recipe;
  signedIn: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate: () => void;
  onPublish?: (makePublic: boolean) => void;
  onRate: (stars: number | null) => void;
  onNote: (note: string) => void;
  onBack: () => void;
  onAddToPlanner: () => void;
}) {
  const [noteDraft, setNoteDraft] = useState(recipe.my_note ?? '');
  useEffect(() => { setNoteDraft(recipe.my_note ?? ''); }, [recipe.id, recipe.my_note]);
  const ingredients = recipe.ingredients ?? [];
  const steps = recipe.steps ?? [];
  return (
    <>
      <div className="page-header">
        <div className="page-header-leading">
          <button className="btn btn-ghost" onClick={onBack} style={{ flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <div>
            <h1 className="page-title" style={{ fontSize: 'clamp(1.35rem, 5vw, 2rem)' }}>{recipe.title}</h1>
            {recipe.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                {recipe.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            )}
          </div>
        </div>
        <div className="page-header-actions" style={{ gap: '0.5rem' }}>
          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              View Source ↗
            </a>
          )}
          <button className="btn btn-primary btn-sm" onClick={onAddToPlanner}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>
            Add to Planner
          </button>
          {onEdit && <button className="btn btn-secondary btn-sm" onClick={onEdit}>Edit</button>}
          {onDelete && <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>}
          {!onEdit && <button className="btn btn-secondary btn-sm" onClick={onDuplicate}>Duplicate to edit</button>}
          {onPublish && recipe.visibility !== 'public' && (
            <button className="btn btn-secondary btn-sm" onClick={() => onPublish(true)}>Make public</button>
          )}
          {onPublish && recipe.visibility === 'public' && (
            <button className="btn btn-secondary btn-sm" onClick={() => onPublish(false)}>Make private</button>
          )}
        </div>
      </div>

      {recipe.image_url ? (
        <img src={recipe.image_url} alt={recipe.title} className="recipe-detail-hero" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <div className="recipe-detail-hero-placeholder">🍽️</div>
      )}

      {recipe.description && (
        <p style={{ fontSize: '1.05rem', color: 'var(--ink-soft)', marginBottom: '1.5rem', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.6 }}>
          {recipe.description}
        </p>
      )}

      {recipe.primary_protein && (
        <div style={{ marginBottom: '1rem' }}><ProteinBadge protein={recipe.primary_protein} /></div>
      )}
      {recipe.owner_display_name && (
        <p className="recipe-owner-line">
          {recipe.visibility === 'public' ? 'Public recipe' : 'Private'} · {recipe.owner_display_name}
        </p>
      )}
      {signedIn && (
        <div className="recipe-personal">
          <div className="recipe-stars" role="group" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                className={`star-btn ${(recipe.my_rating ?? 0) >= n ? 'is-on' : ''}`}
                onClick={() => onRate(recipe.my_rating === n ? null : n)}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
              >★</button>
            ))}
          </div>
          <label className="recipe-note-label">
            Your notes
            <textarea
              className="recipe-note"
              rows={3}
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              onBlur={() => { if (noteDraft !== (recipe.my_note ?? '')) onNote(noteDraft); }}
              placeholder="Tweaks, reminders, who liked it…"
            />
          </label>
        </div>
      )}
      <div className="recipe-meta-bar">
        {recipe.prep_time && (
          <div className="recipe-meta-item">
            <div className="recipe-meta-value">{recipe.prep_time}</div>
            <div className="recipe-meta-label">Prep (min)</div>
          </div>
        )}
        {recipe.cook_time && (
          <div className="recipe-meta-item">
            <div className="recipe-meta-value">{recipe.cook_time}</div>
            <div className="recipe-meta-label">Cook (min)</div>
          </div>
        )}
        {recipe.prep_time && recipe.cook_time && (
          <div className="recipe-meta-item">
            <div className="recipe-meta-value">{recipe.prep_time + recipe.cook_time}</div>
            <div className="recipe-meta-label">Total (min)</div>
          </div>
        )}
        <div className="recipe-meta-item">
          <div className="recipe-meta-value">{recipe.servings}</div>
          <div className="recipe-meta-label">Servings</div>
        </div>
        <div className="recipe-meta-item">
          <div className="recipe-meta-value">{ingredients.length}</div>
          <div className="recipe-meta-label">Ingredients</div>
        </div>
      </div>

      <div className="two-col">
        <div>
          <h2 className="section-title">Ingredients</h2>
          {ingredients.length === 0 ? (
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>No ingredients listed</p>
          ) : (
            <ul className="ingredient-list">
              {ingredients.map((ing, i) => (
                <li key={i}>
                  <span className="ingredient-amount">{[ing.amount, ing.unit].filter(Boolean).join(' ')}</span>
                  <span>{ing.name}</span>
                  {ing.notes && <span style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}> ({ing.notes})</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="section-title">Method</h2>
          {steps.length === 0 ? (
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>No steps listed</p>
          ) : (
            <ol className="step-list">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}
