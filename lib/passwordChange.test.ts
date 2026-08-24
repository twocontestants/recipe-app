import { describe, expect, it } from 'vitest';
import { parsePasswordChangeBody, passwordChangeError } from './passwordChange';

describe('passwordChangeError', () => {
  it('requires both current and new passwords', () => {
    expect(passwordChangeError('', 'next')).toBe('Current and new password are required');
    expect(passwordChangeError('old', '')).toBe('Current and new password are required');
  });

  it('rejects a confirmation that does not match', () => {
    expect(passwordChangeError('old', 'next', 'other')).toBe('New passwords do not match');
  });

  it('rejects reusing the current password', () => {
    expect(passwordChangeError('same', 'same', 'same')).toBe('Choose a different password');
  });

  it('accepts a distinct new password', () => {
    expect(passwordChangeError('old', 'next', 'next')).toBeNull();
    expect(passwordChangeError('old', 'next')).toBeNull();
  });

  it('does not trim passwords', () => {
    expect(passwordChangeError('  old', '  old', '  old')).toBe('Choose a different password');
    expect(passwordChangeError('old', ' next', ' next')).toBeNull();
  });
});

describe('parsePasswordChangeBody', () => {
  it('reads snake_case fields from the API body', () => {
    expect(parsePasswordChangeBody({ current_password: 'old', new_password: 'next' })).toEqual({
      ok: true,
      currentPassword: 'old',
      newPassword: 'next',
    });
  });

  it('returns a 400-style error for a bad body', () => {
    expect(parsePasswordChangeBody(null).ok).toBe(false);
    expect(parsePasswordChangeBody({ current_password: 'old', new_password: 'old' })).toEqual({
      ok: false,
      error: 'Choose a different password',
    });
  });
});
