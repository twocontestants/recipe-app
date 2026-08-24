import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  isSessionId,
  newSessionId,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from './auth';

describe('passwords', () => {
  it('round-trips a hash and rejects a wrong password', async () => {
    const stored = await hashPassword('correct-horse');
    expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(await verifyPassword('correct-horse', stored)).toBe(true);
    expect(await verifyPassword('wrong', stored)).toBe(false);
    expect(await verifyPassword('correct-horse', 'not-a-hash')).toBe(false);
  });
});

describe('session ids', () => {
  it('creates a 64-char hex id suitable for a cookie store', () => {
    const id = newSessionId();
    expect(isSessionId(id)).toBe(true);
    expect(isSessionId('short')).toBe(false);
    expect(SESSION_COOKIE).toBe('mise_session');
    const opts = sessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBeGreaterThan(7 * 24 * 60 * 60);
  });
});
