import { getRedisClient } from '../queue/redis';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  hourWindow: number;
  nextWindowStartMs: number;
  retryAfterMs: number;
}

/**
 * Lua script for atomic check-and-increment of hourly rate limit.
 * Guarantees zero race conditions across multiple concurrent workers.
 *
 * KEYS[1]: email_rate_limit:{userId}:{hourWindow}
 * ARGV[1]: hourlyLimit (e.g. 200)
 * ARGV[2]: ttlSeconds (e.g. 7200)
 *
 * Returns: [allowed (1 or 0), currentCount, ttlRemaining]
 */
const RATE_LIMIT_LUA_SCRIPT = `
  local current = redis.call('get', KEYS[1])
  local limit = tonumber(ARGV[1])
  local ttl = tonumber(ARGV[2])

  if current and tonumber(current) >= limit then
    local remainingTtl = redis.call('ttl', KEYS[1])
    return {0, tonumber(current), remainingTtl}
  end

  local newCount = redis.call('incr', KEYS[1])
  if newCount == 1 then
    redis.call('expire', KEYS[1], ttl)
  end

  local remainingTtl = redis.call('ttl', KEYS[1])
  return {1, newCount, remainingTtl}
`;

export class RateLimiterService {
  /**
   * Computes the current 1-hour window bucket index
   */
  getHourWindow(timestampMs: number = Date.now()): number {
    return Math.floor(timestampMs / (3600 * 1000));
  }

  /**
   * Computes timestamp (in ms) when the next hour window starts
   */
  getNextWindowStartMs(timestampMs: number = Date.now()): number {
    const currentWindow = this.getHourWindow(timestampMs);
    return (currentWindow + 1) * 3600 * 1000;
  }

  /**
   * Atomically checks and increments user's hourly send counter in Redis.
   */
  async checkAndIncrementHourlyLimit(
    userId: string,
    limit: number,
    currentTimeMs: number = Date.now()
  ): Promise<RateLimitCheckResult> {
    const redis = getRedisClient();
    const hourWindow = this.getHourWindow(currentTimeMs);
    const key = `email_rate_limit:${userId}:${hourWindow}`;
    const nextWindowStartMs = this.getNextWindowStartMs(currentTimeMs);
    const retryAfterMs = Math.max(1000, nextWindowStartMs - currentTimeMs);

    // TTL of 2 hours ensures clean cleanup after the window expires
    const ttlSeconds = 7200;

    try {
      const result = (await redis.eval(
        RATE_LIMIT_LUA_SCRIPT,
        1,
        key,
        limit.toString(),
        ttlSeconds.toString()
      )) as [number, number, number];

      const [allowedNum, currentCount] = result;
      const allowed = allowedNum === 1;

      return {
        allowed,
        currentCount,
        limit,
        hourWindow,
        nextWindowStartMs,
        retryAfterMs,
      };
    } catch (error: any) {
      console.warn(`⚠️ [RateLimiter] Rate limiter check error for user ${userId} (${error.message}). Failing open to allow dispatch.`);
      return {
        allowed: true,
        currentCount: 0,
        limit,
        hourWindow,
        nextWindowStartMs,
        retryAfterMs: 0,
      };
    }
  }

  /**
   * Helper to manually inspect current count without incrementing
   */
  async getUsageForCurrentWindow(userId: string, currentTimeMs: number = Date.now()): Promise<number> {
    const redis = getRedisClient();
    const hourWindow = this.getHourWindow(currentTimeMs);
    const key = `email_rate_limit:${userId}:${hourWindow}`;
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }
}

export const rateLimiterService = new RateLimiterService();
