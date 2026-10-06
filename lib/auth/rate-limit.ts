/**
 * PPID Parepare - Login Rate Limiting & Brute-Force Protection
 *
 * Security Baseline:
 * - Maximum 5 consecutive failed login attempts within window.
 * - Temporary cooldown lock (5 minutes) upon reaching threshold.
 * - Non-permanent: locks automatically expire after cooldown.
 * - Reset counter on successful login.
 * - Prevents unlimited password guesses against accounts and IPs.
 * - Generic error responses preventing email enumeration.
 * - Never logs or stores password values.
 */

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes temporary lock

// Module-level in-memory store for tracking failed attempts
const attemptStore = new Map<string, AttemptRecord>();

// Periodic cleanup of stale records every 10 minutes
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attemptStore.entries()) {
      if (record.lockedUntil && record.lockedUntil > now) {
        continue;
      }
      if (now - record.firstAttemptAt > WINDOW_MS) {
        attemptStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Normalizes identifier (IP or email) to prevent bypasses via case/whitespace
 */
export function normalizeIdentifier(identifier: string): string {
  return identifier.toLowerCase().trim();
}

/**
 * Checks if a login attempt is allowed for the given key.
 */
export function checkLoginRateLimit(key: string): RateLimitCheckResult {
  const normKey = normalizeIdentifier(key);
  const record = attemptStore.get(normKey);

  if (!record) {
    return { allowed: true };
  }

  const now = Date.now();

  // If locked, check if cooldown has expired
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, retryAfterSeconds: remainingSec };
    } else {
      // Cooldown expired, reset lockout
      attemptStore.delete(normKey);
      return { allowed: true };
    }
  }

  // If window expired, reset
  if (now - record.firstAttemptAt > WINDOW_MS) {
    attemptStore.delete(normKey);
    return { allowed: true };
  }

  // If attempts reached max
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + COOLDOWN_MS;
    const remainingSec = Math.ceil(COOLDOWN_MS / 1000);
    return { allowed: false, retryAfterSeconds: remainingSec };
  }

  return { allowed: true };
}

/**
 * Records a failed login attempt for the key.
 */
export function recordFailedLogin(key: string): RateLimitCheckResult {
  const normKey = normalizeIdentifier(key);
  const now = Date.now();
  let record = attemptStore.get(normKey);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    record = {
      count: 1,
      firstAttemptAt: now,
      lockedUntil: null,
    };
    attemptStore.set(normKey, record);
    return { allowed: true };
  }

  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + COOLDOWN_MS;
    const remainingSec = Math.ceil(COOLDOWN_MS / 1000);
    return { allowed: false, retryAfterSeconds: remainingSec };
  }

  return { allowed: true };
}

/**
 * Resets the failed attempt counter upon successful login.
 */
export function resetLoginRateLimit(key: string): void {
  const normKey = normalizeIdentifier(key);
  attemptStore.delete(normKey);
}

/**
 * Test helper to inspect current state (used only by test suites)
 */
export function _getAttemptRecord(key: string): AttemptRecord | undefined {
  return attemptStore.get(normalizeIdentifier(key));
}

/**
 * Test helper to clear store (used only by test suites)
 */
export function _clearRateLimitStore(): void {
  attemptStore.clear();
}
