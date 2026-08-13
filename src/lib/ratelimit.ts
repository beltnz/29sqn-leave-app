/**
 * In-memory Sliding Window Rate Limiter
 * Protects public server actions against spam, brute-force, and automated requests.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale records periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 300000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 300000);
}

/**
 * Check and record a rate limit attempt.
 * @param identifier Key identifier (e.g. action name + IP or user token)
 * @param maxRequests Maximum requests allowed within window
 * @param windowMs Time window in milliseconds (default 60 seconds)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { success: boolean; limit: number; remaining: number; resetMs: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier) || { timestamps: [] };

  // Filter timestamps within the current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldestTimestamp));
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetMs,
    };
  }

  record.timestamps.push(now);
  rateLimitStore.set(identifier, record);

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - record.timestamps.length,
    resetMs: windowMs,
  };
}
