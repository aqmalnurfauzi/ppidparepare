/**
 * Tracking Token Cryptographic Utilities
 * Phase 2 — Gate B Public Tracking Security
 *
 * Specifications:
 * - Entropy: 256 bits (32 bytes) CSPRNG (crypto.randomBytes).
 * - Format: Pure Base62 (alphabet: 0-9A-Za-z, exactly 62 characters, zero underscores).
 * - Hash: HMAC-SHA-256 stored as 64-character lowercase hex string.
 * - Verification: Constant-time comparison via crypto.timingSafeEqual.
 * - Side-channel defense: Dummy HMAC computation executed when record is not found.
 */

import * as crypto from 'node:crypto';

export const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// Pre-computed dummy key and target for constant-time dummy HMAC operations
const DUMMY_SECRET = 'ppid-parepare-timing-defense-secret-key-32b';
const DUMMY_TARGET_HASH = crypto
  .createHmac('sha256', DUMMY_SECRET)
  .update('dummy-token-for-constant-time-defense')
  .digest('hex');

/**
 * Encodes a byte buffer into a pure Base62 string.
 */
export function encodeBase62(buffer: Buffer | Uint8Array): string {
  const bytes = Buffer.from(buffer);
  let value = BigInt('0x' + bytes.toString('hex'));
  const base = BigInt(62);
  const zero = BigInt(0);
  let result = '';

  while (value > zero) {
    const remainder = Number(value % base);
    result = BASE62_ALPHABET[remainder] + result;
    value = value / base;
  }

  // Preserve leading zeros from the original buffer
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    result = BASE62_ALPHABET[0] + result;
  }

  return result || BASE62_ALPHABET[0];
}

/**
 * Generate a cryptographically secure 256-bit entropy tracking token.
 * Output: ~43 character pure Base62 string (0-9A-Za-z only).
 */
export function generateTrackingToken(): string {
  const randomBytes = crypto.randomBytes(32); // 256 bits of entropy
  return encodeBase62(randomBytes);
}

/**
 * Validates that token matches pure Base62 format.
 */
export function isValidTrackingTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  // Standard 256-bit Base62 token is ~43 chars, allow 32-50 chars of [0-9A-Za-z]
  return /^[0-9A-Za-z]{32,50}$/.test(token);
}

/**
 * Resolves the HMAC secret from environment.
 */
export function getTrackingTokenSecret(): string {
  const secret = process.env.TRACKING_TOKEN_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL CONFIG ERROR: TRACKING_TOKEN_SECRET must be set in production environment.');
    }
    // Secure fallback for local testing & development only
    return 'dev-fallback-secret-key-ppid-parepare-2026-min-32-chars';
  }
  return secret;
}

/**
 * Computes HMAC-SHA-256 hash of a tracking token.
 * Output: 64-character lowercase hex string.
 */
export function hashTrackingToken(token: string, customSecret?: string): string {
  const secret = customSecret || getTrackingTokenSecret();
  return crypto
    .createHmac('sha256', secret)
    .update(token.trim())
    .digest('hex');
}

/**
 * Constant-time verification of a tracking token against a stored HMAC hash.
 * Includes a dummy HMAC execution branch to prevent timing side-channel attacks
 * when a permohonan record is not found.
 */
export function verifyTrackingToken(
  token: string,
  storedHash: string | null | undefined,
  customSecret?: string
): boolean {
  const secret = customSecret || getTrackingTokenSecret();

  // If no stored hash exists (e.g. record not found or unclaimed legacy permohonan)
  if (!storedHash || typeof storedHash !== 'string' || storedHash.length !== 64) {
    // Run dummy HMAC and dummy timingSafeEqual to normalize execution time
    const dummyCalculated = crypto
      .createHmac('sha256', DUMMY_SECRET)
      .update(token || 'invalid')
      .digest('hex');
    crypto.timingSafeEqual(
      Buffer.from(dummyCalculated, 'utf-8'),
      Buffer.from(DUMMY_TARGET_HASH, 'utf-8')
    );
    return false;
  }

  const calculatedHash = crypto
    .createHmac('sha256', secret)
    .update(token.trim())
    .digest('hex');

  const bufStored = Buffer.from(storedHash, 'utf-8');
  const bufCalculated = Buffer.from(calculatedHash, 'utf-8');

  if (bufStored.length !== bufCalculated.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufStored, bufCalculated);
}
