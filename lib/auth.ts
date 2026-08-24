import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCb);

export const SESSION_COOKIE = 'mise_session';
export const SESSION_MAX_AGE_SEC = 60 * 24 * 60 * 60; // 60 days
export const SESSION_ID_BYTES = 32;
const HASH_LEN = 64;

export function newSessionId(): string {
  return randomBytes(SESSION_ID_BYTES).toString('hex');
}

export function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, HASH_LEN)) as Buffer;
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, 'hex');
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  if (!salt.length || !expected.length) return false;
  const candidate = (await scrypt(password, salt, expected.length)) as Buffer;
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === 'production',
  };
}

export function bootstrapOwnerPassword(): string {
  const value = process.env.BOOTSTRAP_OWNER_PASSWORD;
  if (!value || !value.trim()) {
    throw new Error('BOOTSTRAP_OWNER_PASSWORD is not set');
  }
  return value;
}
