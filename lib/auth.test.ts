import { afterEach, describe, expect, it } from 'vitest';
import {
  bootstrapOwnerPassword,
  hashPassword,
  isSessionId,
  newSessionId,
  optionalBootstrapOwnerPassword,
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

describe('bootstrap password', () => {
  const previous = process.env.BOOTSTRAP_OWNER_PASSWORD;

  afterEach(() => {
    if (previous === undefined) delete process.env.BOOTSTRAP_OWNER_PASSWORD;
    else process.env.BOOTSTRAP_OWNER_PASSWORD = previous;
  });

  it('fails closed when the host env is missing', () => {
    delete process.env.BOOTSTRAP_OWNER_PASSWORD;
    expect(() => bootstrapOwnerPassword()).toThrow(/BOOTSTRAP_OWNER_PASSWORD/);
  });

  it('returns the host value when set', () => {
    process.env.BOOTSTRAP_OWNER_PASSWORD = 'from-env';
    expect(bootstrapOwnerPassword()).toBe('from-env');
    expect(optionalBootstrapOwnerPassword()).toBe('from-env');
  });

  it('trims surrounding whitespace from the host value', () => {
    process.env.BOOTSTRAP_OWNER_PASSWORD = '  from-env  ';
    expect(bootstrapOwnerPassword()).toBe('from-env');
  });

  it('treats a whitespace-only value as missing', () => {
    process.env.BOOTSTRAP_OWNER_PASSWORD = '   ';
    expect(optionalBootstrapOwnerPassword()).toBeNull();
    expect(() => bootstrapOwnerPassword()).toThrow(/BOOTSTRAP_OWNER_PASSWORD/);
  });
});
