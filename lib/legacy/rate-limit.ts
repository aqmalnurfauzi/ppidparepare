/**
 * In-memory Rate Limiting for Legacy Permohonan Claims
 * Phase 2 Gate B — Step 6
 */

export const RATE_LIMIT_MAX_FAILURES = 3;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitEntry {
  failures: number;
  resetAt: number;
}

const claimRateLimits = new Map<string, RateLimitEntry>();

export function checkClaimRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
} {
  const now = Date.now();
  const entry = claimRateLimits.get(identifier);

  if (!entry || now > entry.resetAt) {
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_FAILURES };
  }

  if (entry.failures >= RATE_LIMIT_MAX_FAILURES) {
    return { allowed: false, remainingAttempts: 0 };
  }

  return {
    allowed: true,
    remainingAttempts: RATE_LIMIT_MAX_FAILURES - entry.failures,
  };
}

export function recordClaimFailure(identifier: string): void {
  const now = Date.now();
  const entry = claimRateLimits.get(identifier);

  if (!entry || now > entry.resetAt) {
    claimRateLimits.set(identifier, {
      failures: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  entry.failures += 1;
}

export function resetClaimRateLimit(identifier: string): void {
  claimRateLimits.delete(identifier);
}
