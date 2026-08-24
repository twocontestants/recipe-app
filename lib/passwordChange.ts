/** Shared rules for Settings password change (API + form). Passwords are not trimmed. */

export function passwordChangeError(
  currentPassword: string,
  newPassword: string,
  confirmPassword?: string,
): string | null {
  if (!currentPassword || !newPassword) {
    return 'Current and new password are required';
  }
  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return 'New passwords do not match';
  }
  if (currentPassword === newPassword) {
    return 'Choose a different password';
  }
  return null;
}

export function parsePasswordChangeBody(body: unknown):
  | { ok: true; currentPassword: string; newPassword: string }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Current and new password are required' };
  }
  const record = body as Record<string, unknown>;
  const currentPassword = String(record.current_password ?? record.currentPassword ?? '');
  const newPassword = String(record.new_password ?? record.newPassword ?? '');
  const confirmRaw = record.confirm_password ?? record.confirmPassword;
  const confirmPassword = typeof confirmRaw === 'string' ? confirmRaw : undefined;
  const error = passwordChangeError(currentPassword, newPassword, confirmPassword);
  if (error) return { ok: false, error };
  return { ok: true, currentPassword, newPassword };
}
