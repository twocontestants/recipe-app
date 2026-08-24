'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { showToast } from './Toast';
import { passwordChangeError } from '@/lib/passwordChange';

export function AccountSettings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    const formError = passwordChangeError(currentPassword, newPassword, confirmPassword);
    if (formError) {
      setError(formError);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(res.ok ? 'Could not read the response' : `Could not update password (${res.status})`);
      }
      if (!res.ok) throw new Error(data.error || 'Could not update password');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update password';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      router.replace('/recipes');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <section className="account-settings">
      <h2 className="section-title">Account</h2>
      <p className="account-who">
        Signed in as <strong>{user.display_name}</strong>
        <span className="account-meta">{user.login_name} · <span className="account-role">{user.role}</span></span>
      </p>

      <form onSubmit={onChangePassword} className="account-password-form">
        <p className="account-form-title">Change password</p>
        {error ? <p className="account-error" role="alert">{error}</p> : null}
        <label className="form-group">
          Current password
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label className="form-group">
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
          />
        </label>
        <label className="form-group">
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Please wait…' : 'Update password'}
        </button>
      </form>

      <button className="btn btn-secondary" type="button" onClick={onSignOut} disabled={signingOut}>
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </section>
  );
}
