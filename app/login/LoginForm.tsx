'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { showToast } from '@/components/Toast';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, refresh } = useAuth();
  const next = params.get('next') || '/recipes';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!loading && user) {
    router.replace(next.startsWith('/') ? next : '/recipes');
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'login'
          ? { login, password }
          : { email, password, display_name: displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not sign in');
      await refresh();
      showToast(mode === 'login' ? 'Signed in' : 'Account created', 'success');
      router.replace(next.startsWith('/') ? next : '/recipes');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not sign in', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <p className="login-kicker">Mise en Place</p>
        <h1 className="login-title">{mode === 'login' ? 'Sign in' : 'Create an account'}</h1>
        <p className="login-sub">
          {mode === 'login'
            ? 'Your recipes, planner, and notes stay in your kitchen.'
            : 'New accounts start as Cook — private recipes only.'}
        </p>
        <form onSubmit={onSubmit} className="login-form">
          {mode === 'login' ? (
            <label className="form-group">
              Email or name
              <input value={login} onChange={e => setLogin(e.target.value)} autoComplete="username" required />
            </label>
          ) : (
            <>
              <label className="form-group">
                Email
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
              </label>
              <label className="form-group">
                Display name
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} autoComplete="nickname" placeholder="Optional" />
              </label>
            </>
          )}
          <label className="form-group">
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          </label>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button className="link-btn" type="button" onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
