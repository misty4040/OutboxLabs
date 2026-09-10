import { processEmailDispatchJob } from './emailProcessor';
import { emailSenderService } from '../services/emailSender.service';
import { emailJobRepository } from '../repositories/emailJob.repository';
import { rateLimiterService } from '../services/rateLimiter.service';
import { rateLimitNotifierService } from '../services/rateLimitNotifier.service';
import { Job } from 'bullmq';
import { EmailJobData } from './emailQueue';

jest.mock('../services/emailSender.service');
jest.mock('../repositories/emailJob.repository');
jest.mock('../services/rateLimiter.service');
jest.mock('../services/rateLimitNotifier.service');
jest.mock('../services/elasticsearch.service', () => ({
  elasticsearchService: {
    indexEmailJob: jest.fn().mockResolvedValue({}),
  },
}));
jest.mock('./emailQueue', () => ({
  getEmailQueue: jest.fn().mockReturnValue({
    add: jest.fn().mockResolvedValue({ id: 're-enqueued-job' }),
  }),
}));

describe('Phase 6 & 7: Email Job Processor & Rate Limiting Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send email and mark status as SENT when rate limit allows', async () => {
    (rateLimiterService.checkAndIncrementHourlyLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      currentCount: 1,
      limit: 200,
      hourWindow: 100,
      nextWindowStartMs: 360000000,
      retryAfterMs: 1800000,
    });

    const mockJob = {
      id: 'bull_123',
      data: {
        emailJobId: 'job_record_99',
        userId: 'user_1',
        recipient: 'test@target.com',
        subject: 'Hello',
        body: 'World',
        hourlyLimit: 200,
      },
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as unknown as Job<EmailJobData>;

    (emailJobRepository.claimJobForProcessing as jest.Mock).mockResolvedValue(true);
    (emailSenderService.sendEmail as jest.Mock).mockResolvedValue({
      messageId: '<msg-123>',
      previewUrl: 'https://ethereal.email/message/msg-123',
    });

    const result = await processEmailDispatchJob(mockJob);

    expect(result.status).toBe('SENT');
    expect(emailJobRepository.claimJobForProcessing).toHaveBeenCalledWith('job_record_99');
    expect(emailSenderService.sendEmail).toHaveBeenCalledWith({
      to: 'test@target.com',
      subject: 'Hello',
      body: 'World',
    });
    expect(emailJobRepository.markSent).toHaveBeenCalledWith(
      'job_record_99',
      expect.any(Date)
    );
  });

  it('should abort email dispatch immediately if atomic claim fails (zero double-sends)', async () => {
    (rateLimiterService.checkAndIncrementHourlyLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      currentCount: 1,
      limit: 200,
      hourWindow: 100,
      nextWindowStartMs: 360000000,
      retryAfterMs: 1800000,
    });

    // Worker loses race condition: another worker claimed the job!
    (emailJobRepository.claimJobForProcessing as jest.Mock).mockResolvedValue(false);

    const mockJob = {
      id: 'bull_racing_1',
      data: {
        emailJobId: 'job_record_racing',
        userId: 'user_1',
        recipient: 'racing@target.com',
        subject: 'Hello',
        body: 'World',
        hourlyLimit: 200,
      },
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as unknown as Job<EmailJobData>;

    const result = await processEmailDispatchJob(mockJob);

    expect(result.status).toBe('ALREADY_PROCESSED');
    expect(emailJobRepository.claimJobForProcessing).toHaveBeenCalledWith('job_record_racing');
    // Ensure SMTP was NEVER called!
    expect(emailSenderService.sendEmail).not.toHaveBeenCalled();
    expect(emailJobRepository.markSent).not.toHaveBeenCalled();
  });

  it('should reschedule job without failing when hourly limit is reached', async () => {
    const nextWindowStartMs = Date.now() + 1800000;
    (rateLimiterService.checkAndIncrementHourlyLimit as jest.Mock).mockResolvedValue({
      allowed: false,
      currentCount: 200,
      limit: 200,
      hourWindow: 50,
      nextWindowStartMs,
      retryAfterMs: 1800000,
    });

    const mockMoveToDelayed = jest.fn().mockResolvedValue(undefined);
    const mockJob = {
      id: 'bull_capped_1',
      token: 'lock-token-123',
      data: {
        emailJobId: 'job_record_capped',
        userId: 'user_1',
        recipient: 'capped@target.com',
        subject: 'Hello',
        body: 'World',
        hourlyLimit: 200,
      },
      moveToDelayed: mockMoveToDelayed,
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as unknown as Job<EmailJobData>;

    const result = await processEmailDispatchJob(mockJob);

    expect(result.status).toBe('RATE_LIMITED');
    expect(emailSenderService.sendEmail).not.toHaveBeenCalled();
    expect(emailJobRepository.markRateLimited).toHaveBeenCalledWith(
      'job_record_capped',
      new Date(nextWindowStartMs)
    );
    expect(mockMoveToDelayed).toHaveBeenCalledWith(nextWindowStartMs, 'lock-token-123');
    expect(rateLimitNotifierService.notifyRateLimitEvent).toHaveBeenCalledWith(
      'user_1',
      50,
      200,
      new Date(nextWindowStartMs)
    );
  });

  it('should mark job as FAILED when SMTP throws and max attempts are exceeded', async () => {
    (rateLimiterService.checkAndIncrementHourlyLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      currentCount: 1,
      limit: 200,
      hourWindow: 100,
      nextWindowStartMs: 360000000,
      retryAfterMs: 1800000,
    });
    (emailJobRepository.claimJobForProcessing as jest.Mock).mockResolvedValue(true);

    const mockJob = {
      id: 'bull_123',
      data: {
        emailJobId: 'job_record_99',
        userId: 'user_1',
        recipient: 'test@target.com',
        subject: 'Hello',
        body: 'World',
      },
      opts: { attempts: 3 },
      attemptsMade: 2, // 3rd attempt
    } as unknown as Job<EmailJobData>;

    (emailSenderService.sendEmail as jest.Mock).mockRejectedValue(
      new Error('SMTP Connection Refused')
    );

    await expect(processEmailDispatchJob(mockJob)).rejects.toThrow('SMTP Connection Refused');

    expect(emailJobRepository.markFailed).toHaveBeenCalledWith(
      'job_record_99',
      'SMTP Connection Refused',
      expect.any(Date)
    );
  });
});
