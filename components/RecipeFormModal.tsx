'use client';

import type { Ingredient } from '@/lib/db';
import type { RecipeFormState } from '@/lib/recipeForm';
import { PROTEIN_COLORS, PROTEIN_EMOJI, PROTEIN_OPTIONS } from './ProteinBadge';

type Props = {
  heading: string;
  form: RecipeFormState;
  onChange: (form: RecipeFormState) => void;
  saving: boolean;
  saveLabel: string;
  onSave: () => void;
  onClose: () => void;
  importFromUrl?: {
    url: string;
    scraping: boolean;
    onUrlChange: (url: string) => void;
    onScrape: () => void;
    onPasteInstead: () => void;
  };
};

export function RecipeFormModal({
  heading,
  form,
  onChange,
  saving,
  saveLabel,
  onSave,
  onClose,
  importFromUrl,
}: Props) {
  const update = (patch: Partial<RecipeFormState>) => onChange({ ...form, ...patch });

  const updateIngredient = (i: number, field: keyof Ingredient, val: string) => {
    const ingredients = [...form.ingredients];
    ingredients[i] = { ...ingredients[i], [field]: val };
    update({ ingredients });
  };

  const addIngredient = () => update({
    ingredients: [...form.ingredients, { amount: '', unit: '', name: '' }],
  });

  const removeIngredient = (i: number) => update({
    ingredients: form.ingredients.filter((_, idx) => idx !== i),
  });

  const updateStep = (i: number, val: string) => {
    const steps = [...form.steps];
    steps[i] = val;
    update({ steps });
  };

  const addStep = () => update({ steps: [...form.steps, ''] });
  const removeStep = (i: number) => update({ steps: form.steps.filter((_, idx) => idx !== i) });

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: '780px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{heading}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {importFromUrl && (
          <>
            <div className="form-group">
              <label>Import from URL</label>
              <div className="url-input-group">
                <input type="url" placeholder="https://example.com/recipe…" value={importFromUrl.url} onChange={e => importFromUrl.onUrlChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && importFromUrl.onScrape()} />
                <button className="btn btn-secondary" onClick={importFromUrl.onScrape} disabled={importFromUrl.scraping || !importFromUrl.url.trim()}>
                  {importFromUrl.scraping ? <span className="loading-dots"><span/><span/><span/></span> : 'Import'}
                </button>
              </div>
              <p className="scrape-hint">Works with AllRecipes, BBC Good Food, Serious Eats, NYT Cooking, and most recipe sites · <button className="link-btn" onClick={importFromUrl.onPasteInstead}>Paste text instead →</button></p>
            </div>
            <div className="divider" style={{ margin: '1rem 0' }} />
          </>
        )}

        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Title *</label>
            <input type="text" value={form.title} onChange={e => update({ title: e.target.value })} placeholder="Recipe name" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea value={form.description} onChange={e => update({ description: e.target.value })} placeholder="Brief description…" rows={2} />
          </div>
          <div className="form-group">
            <label>Servings</label>
            <input type="number" value={form.servings} min={1} onChange={e => update({ servings: +e.target.value })} />
          </div>
          <div className="form-group">
            <label>Image URL</label>
            <input type="url" value={form.image_url} onChange={e => update({ image_url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="form-group">
            <label>Prep time (minutes)</label>
            <input type="number" value={form.prep_time || ''} min={0} onChange={e => update({ prep_time: e.target.value ? +e.target.value : undefined })} />
          </div>
          <div className="form-group">
            <label>Cook time (minutes)</label>
            <input type="number" value={form.cook_time || ''} min={0} onChange={e => update({ cook_time: e.target.value ? +e.target.value : undefined })} />
          </div>
          <div className="form-group">
            <label>Source URL</label>
            <input type="url" value={form.source_url} onChange={e => update({ source_url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Primary Protein</label>
            <div className="protein-picker">
              <button
                type="button"
                className={`protein-btn ${!form.primary_protein ? 'active none' : ''}`}
                onClick={() => update({ primary_protein: '' })}
              >
                None / Veg
              </button>
              {PROTEIN_OPTIONS.map(p => (
                <button
                  key={p}
                  type="button"
                  className={`protein-btn ${form.primary_protein === p ? 'active' : ''}`}
                  style={form.primary_protein === p ? { background: PROTEIN_COLORS[p], borderColor: PROTEIN_COLORS[p], color: 'white' } : {}}
                  onClick={() => update({ primary_protein: form.primary_protein === p ? '' : p })}
                >
                  {PROTEIN_EMOJI[p]} {p}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Tags (comma separated)</label>
            <input type="text" value={form.tags.join(', ')} onChange={e => update({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="spicy, oven, slow-cooker" />
          </div>
        </div>

        <div className="form-group">
          <label>Ingredients</label>
          <div className="ingredient-row-header">
            <span>Amount</span>
            <span>Unit</span>
            <span>Ingredient</span>
            <span />
          </div>
          {form.ingredients.map((ing, i) => (
            <div key={i} className="ingredient-row">
              <input type="text" value={ing.amount} onChange={e => updateIngredient(i, 'amount', e.target.value)} placeholder="2" />
              <input type="text" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} placeholder="cups" />
              <input type="text" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} placeholder="flour" />
              <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--ink-muted)' }} onClick={() => removeIngredient(i)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
          <button className="add-row-btn" onClick={addIngredient}>+ Add ingredient</button>
        </div>

        <div className="form-group">
          <label>Steps</label>
          {form.steps.map((step, i) => (
            <div key={i} className="step-row">
              <div className="step-number">{i + 1}</div>
              <textarea value={step} onChange={e => updateStep(i, e.target.value)} placeholder={`Step ${i + 1}…`} rows={2} />
              <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--ink-muted)', marginTop: '0.65rem' }} onClick={() => removeStep(i)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
          <button className="add-row-btn" onClick={addStep}>+ Add step</button>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? <span className="loading-dots"><span/><span/><span/></span> : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
