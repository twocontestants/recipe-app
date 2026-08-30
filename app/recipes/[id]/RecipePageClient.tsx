'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Recipe } from '@/lib/db';
import { showToast } from '@/components/Toast';
import { useAuth } from '@/components/AuthProvider';
import { RecipeDetail } from '@/components/RecipeDetail';
import { RecipeFormModal } from '@/components/RecipeFormModal';
import { useAddToPlannerModal } from '@/components/useAddToPlannerModal';
import { recipeViewPath, recipeWantsEdit } from '@/lib/recipeLinks';
import { EMPTY_RECIPE_FORM, recipeFormPayload, recipeToForm, type RecipeFormState } from '@/lib/recipeForm';

export default function RecipePageClient({ recipeId }: { recipeId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState<RecipeFormState>({ ...EMPTY_RECIPE_FORM });
  const [saving, setSaving] = useState(false);
  const openedEditRef = useRef(false);
  const { openPlannerModal, plannerModalJsx } = useAddToPlannerModal(user?.id);

  const loginNext = `/login?next=${encodeURIComponent(recipeViewPath(recipeId))}`;

  const loadRecipe = useCallback(async () => {
    setLoading(true);
    setMissing(false);
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(recipeId)}`);
      if (res.status === 404) {
        setRecipe(null);
        setMissing(true);
        return;
      }
      if (!res.ok) throw new Error('Failed to load');
      setRecipe(await res.json() as Recipe);
    } catch {
      showToast('Failed to load recipe', 'error');
      setRecipe(null);
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => { void loadRecipe(); }, [loadRecipe]);

  useEffect(() => {
    openedEditRef.current = false;
  }, [recipeId]);

  useEffect(() => {
    if (!recipe || !recipeWantsEdit(searchParams) || openedEditRef.current) return;
    if (!recipe.can_edit) return;
    openedEditRef.current = true;
    setForm(recipeToForm(recipe));
    setShowEditor(true);
  }, [recipe, searchParams]);

  const openEditor = (full: Recipe) => {
    setForm(recipeToForm(full));
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    if (recipeWantsEdit(searchParams)) router.replace(recipeViewPath(recipeId));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(recipeId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeFormPayload(form)),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setRecipe(await res.json() as Recipe);
      closeEditor();
      showToast('Recipe updated!', 'success');
    } catch (e) {
      showToast(`Failed to save: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this recipe?')) return;
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(recipeId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Recipe deleted', 'info');
      router.replace('/recipes');
    } catch {
      showToast('Failed to delete recipe', 'error');
    }
  };

  const handleDuplicate = async () => {
    if (!user) { router.push(loginNext); return; }
    if (!recipe) return;
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(recipe.id)}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      const copy = await res.json() as Recipe;
      showToast('Copied to your kitchen — you can edit this one', 'success');
      router.replace(recipeViewPath(copy.id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not duplicate', 'error');
    }
  };

  const handlePublish = async (makePublic: boolean) => {
    if (!recipe) return;
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(recipe.id)}/${makePublic ? 'publish' : 'unpublish'}`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      setRecipe(await res.json() as Recipe);
      showToast(makePublic ? 'Recipe is public' : 'Recipe is private', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not change visibility', 'error');
    }
  };

  const handleRating = async (stars: number | null) => {
    if (!user) { router.push(loginNext); return; }
    if (!recipe) return;
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(recipe.id)}/rating`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars }),
      });
      if (!res.ok) throw new Error();
      setRecipe({ ...recipe, my_rating: stars });
    } catch {
      showToast('Could not save rating', 'error');
    }
  };

  const handleNote = async (note: string) => {
    if (!user) { router.push(loginNext); return; }
    if (!recipe) return;
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(recipe.id)}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error();
      setRecipe({ ...recipe, my_note: note });
    } catch {
      showToast('Could not save note', 'error');
    }
  };

  const tryOpenPlanner = () => {
    if (!user) { router.push(loginNext); return; }
    if (recipe) openPlannerModal(recipe);
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="loading-dots"><span/><span/><span/></div>
      </div>
    );
  }

  if (missing || !recipe) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🍽️</div>
        <h3>Recipe not found</h3>
        <p>It may have been deleted or is private.</p>
        <button className="btn btn-secondary" onClick={() => router.push('/recipes')}>Back to recipes</button>
      </div>
    );
  }

  return (
    <>
      <RecipeDetail
        recipe={recipe}
        signedIn={!!user}
        onEdit={recipe.can_edit ? () => openEditor(recipe) : undefined}
        onDelete={recipe.can_edit ? handleDelete : undefined}
        onDuplicate={handleDuplicate}
        onPublish={recipe.can_publish ? handlePublish : undefined}
        onRate={handleRating}
        onNote={handleNote}
        onBack={() => router.back()}
        onAddToPlanner={tryOpenPlanner}
      />
      {showEditor && (
        <RecipeFormModal
          heading="Edit Recipe"
          form={form}
          onChange={setForm}
          saving={saving}
          saveLabel="Save Changes"
          onSave={() => { void handleSave(); }}
          onClose={closeEditor}
        />
      )}
      {plannerModalJsx}
    </>
  );
}
