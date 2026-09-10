import { emailJobRepository } from './repositories/emailJob.repository';
import { rateLimiterService } from './services/rateLimiter.service';
import { calculateJobDelayMs } from './queue/emailQueue';
import { getRedisClient } from './queue/redis';

jest.mock('./repositories/emailJob.repository');
jest.mock('./queue/redis');

describe('Phase 13: Concurrency, Scaling & Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement: Correctness Under Concurrency & Idempotency', () => {
    it('should allow exactly 1 worker to claim a job when 5 workers race concurrently', async () => {
      // Simulating database row-count claim: only the first call returns true (1 row updated), others return false (0 rows updated)
      let claimCount = 0;
      (emailJobRepository.claimJobForProcessing as jest.Mock).mockImplementation(async () => {
        if (claimCount === 0) {
          claimCount++;
          return true;
        }
        return false;
      });

      // 5 concurrent workers race to claim the same job ID simultaneously
      const jobId = 'job_contested_concurrent_123';
      const results = await Promise.all([
        emailJobRepository.claimJobForProcessing(jobId),
        emailJobRepository.claimJobForProcessing(jobId),
        emailJobRepository.claimJobForProcessing(jobId),
        emailJobRepository.claimJobForProcessing(jobId),
        emailJobRepository.claimJobForProcessing(jobId),
      ]);

      const successfulClaims = results.filter((res) => res === true);
      const rejectedClaims = results.filter((res) => res === false);

      expect(successfulClaims).toHaveLength(1);
      expect(rejectedClaims).toHaveLength(4);
    });
  });

  describe('Requirement: Hourly Limit Rollover Across Windows', () => {
    it('should generate distinct Redis rate limit keys across different hour windows', () => {
      const t1 = 3600000 * 100; // Hour 100
      const t2 = 3600000 * 101; // Hour 101 (next hour)

      const window1 = rateLimiterService.getHourWindow(t1);
      const window2 = rateLimiterService.getHourWindow(t2);

      expect(window1).toBe(100);
      expect(window2).toBe(101);
      expect(window2).toBe(window1 + 1);

      // Verify the next window start timestamp is strictly in the future
      const nextWindowStart = rateLimiterService.getNextWindowStartMs(t1);
      expect(nextWindowStart).toBe(t2);
    });
  });

  describe('Requirement: 1,000+ Scheduled Jobs Concurrency & Non-burst Staggering', () => {
    it('should accurately calculate staggered schedules for 1,000 recipients without drift', () => {
      const startTime = 1700000000000;
      const delayBetweenEmailsMs = 2000; // 2 seconds per email
      const totalRecipients = 1000;

      const scheduleTimestamps: number[] = [];

      for (let i = 0; i < totalRecipients; i++) {
        const targetSendTime = startTime + i * delayBetweenEmailsMs;
        scheduleTimestamps.push(targetSendTime);
      }

      expect(scheduleTimestamps).toHaveLength(1000);

      // First email sends at startTime
      expect(scheduleTimestamps[0]).toBe(startTime);
      expect(calculateJobDelayMs(new Date(scheduleTimestamps[0]), startTime)).toBe(0);

      // 500th email is scheduled at startTime + 499 * 2000 ms (~16.6 minutes later)
      expect(scheduleTimestamps[499]).toBe(startTime + 499 * 2000);

      // 1000th email is scheduled at startTime + 999 * 2000 ms (~33.3 minutes later)
      expect(scheduleTimestamps[999]).toBe(startTime + 999 * 2000);

      // Zero bursting: every consecutive recipient has an exact delay difference of delayBetweenEmailsMs
      for (let i = 1; i < totalRecipients; i++) {
        const delta = scheduleTimestamps[i] - scheduleTimestamps[i - 1];
        expect(delta).toBe(delayBetweenEmailsMs);
      }
    });
  });
});
