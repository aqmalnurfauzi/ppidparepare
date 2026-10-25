/**
 * In-memory IP/identifier rate limiting for public tracking lookups
 * Prevents automated enumeration of application numbers & brute force of tokens.
 */
interface RateLimitBucket {
  attempts: number;
  resetAt: number;
}

const trackingRateLimits = new Map<string, RateLimitBucket>();

export function checkTrackingRateLimit(identifier: string): boolean {
  const now = Date.now();
  const bucket = trackingRateLimits.get(identifier);

  if (!bucket || now > bucket.resetAt) {
    trackingRateLimits.set(identifier, { attempts: 1, resetAt: now + 15 * 60 * 1000 }); // 15 mins window
    return true;
  }

  if (bucket.attempts >= 10) {
    return false; // Rate limit exceeded
  }

  bucket.attempts += 1;
  return true;
}

export function resetTrackingRateLimitForTests(): void {
  trackingRateLimits.clear();
}
