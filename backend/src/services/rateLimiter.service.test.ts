import { rateLimiterService } from './rateLimiter.service';
import { getRedisClient } from '../queue/redis';

jest.mock('../queue/redis');

describe('Phase 7: Redis-Backed Hourly Rate Limiter Service', () => {
  const mockEval = jest.fn();
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockReturnValue({
      eval: mockEval,
      get: mockGet,
    });
  });

  describe('Window Calculations', () => {
    it('should compute exact 1-hour window indices', () => {
      // 3600000 ms = 1 hour
      const t1 = 3600000 * 10; // Exactly hour 10
      expect(rateLimiterService.getHourWindow(t1)).toBe(10);

      const t2 = 3600000 * 10 + 1800000; // Half past hour 10
      expect(rateLimiterService.getHourWindow(t2)).toBe(10);

      const t3 = 3600000 * 11; // Hour 11
      expect(rateLimiterService.getHourWindow(t3)).toBe(11);
    });

    it('should compute start timestamp of next window', () => {
      const now = 3600000 * 5 + 1000; // In hour 5
      const nextWindow = rateLimiterService.getNextWindowStartMs(now);

      expect(nextWindow).toBe(3600000 * 6);
      expect(nextWindow - now).toBe(3600000 - 1000);
    });
  });

  describe('Atomic Check & Increment via Lua Script', () => {
    it('should allow send when below hourly limit', async () => {
      // Lua returns: [1 (allowed), 5 (newCount), 3500 (ttl)]
      mockEval.mockResolvedValue([1, 5, 3500]);

      const now = 1000000000000;
      const result = await rateLimiterService.checkAndIncrementHourlyLimit('user_1', 200, now);

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(5);
      expect(mockEval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        expect.stringContaining('email_rate_limit:user_1:'),
        '200',
        '7200'
      );
    });

    it('should reject send and provide retryAfterMs when at or above limit', async () => {
      // Lua returns: [0 (not allowed), 200 (currentCount), 1200 (ttl)]
      mockEval.mockResolvedValue([0, 200, 1200]);

      const now = 3600000 * 4 + 600000; // 10 mins into hour 4
      const result = await rateLimiterService.checkAndIncrementHourlyLimit('user_1', 200, now);

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(200);
      expect(result.nextWindowStartMs).toBe(3600000 * 5);
      expect(result.retryAfterMs).toBe(3600000 * 5 - now);
    });
  });
});
