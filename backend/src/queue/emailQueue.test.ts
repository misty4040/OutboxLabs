import { calculateJobDelayMs, enqueueEmailJob } from './emailQueue';
import { emailJobRepository } from '../repositories/emailJob.repository';
import { EmailJobStatus } from '@prisma/client';

// Mock BullMQ and repository
const mockAdd = jest.fn();
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockAdd,
    close: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

jest.mock('./redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({}),
}));

jest.mock('../repositories/emailJob.repository', () => ({
  emailJobRepository: {
    updateBullJobId: jest.fn().mockResolvedValue({}),
  },
}));

describe('Phase 5: Queue & Delay Calculation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateJobDelayMs', () => {
    it('should compute exact delay for future scheduled time', () => {
      const now = 1700000000000;
      const future = new Date(now + 15000); // 15 seconds in future

      const delay = calculateJobDelayMs(future, now);
      expect(delay).toBe(15000);
    });

    it('should return 0 when scheduled time is in the past', () => {
      const now = 1700000000000;
      const past = new Date(now - 10000); // 10 seconds in past

      const delay = calculateJobDelayMs(past, now);
      expect(delay).toBe(0);
    });
  });

  describe('enqueueEmailJob', () => {
    it('should enqueue job with custom jobId matching EmailJob ID to prevent duplicates', async () => {
      const mockJob = {
        id: 'job_record_abc',
        campaignId: 'camp_123',
        userId: 'user_456',
        recipient: 'test@example.com',
        subject: 'Subject',
        body: 'Body',
        scheduledAt: new Date(Date.now() + 5000),
        status: EmailJobStatus.PENDING,
        attempts: 0,
        sentAt: null,
        failedAt: null,
        errorMessage: null,
        bullJobId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAdd.mockResolvedValue({ id: 'job_record_abc' });

      const bullJobId = await enqueueEmailJob(mockJob, {
        hourlyLimit: 200,
        delayBetweenEmailsMs: 2000,
      });

      expect(bullJobId).toBe('job_record_abc');
      expect(mockAdd).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({
          emailJobId: 'job_record_abc',
          recipient: 'test@example.com',
          hourlyLimit: 200,
        }),
        expect.objectContaining({
          jobId: 'job_record_abc',
        })
      );
      expect(emailJobRepository.updateBullJobId).toHaveBeenCalledWith('job_record_abc', 'job_record_abc');
    });
  });
});
