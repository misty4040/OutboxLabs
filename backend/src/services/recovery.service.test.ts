import { recoveryService } from './recovery.service';
import { prisma } from '../db/prisma';
import { enqueueEmailJob } from '../queue/emailQueue';
import { EmailJobStatus } from '@prisma/client';

jest.mock('../db/prisma', () => ({
  prisma: {
    emailJob: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../queue/emailQueue', () => ({
  enqueueEmailJob: jest.fn().mockResolvedValue('new-bull-id'),
}));

describe('Phase 8: Recovery Service & Restart Reconciliation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 0 when no stale PROCESSING jobs exist', async () => {
    (prisma.emailJob.findMany as jest.Mock).mockResolvedValue([]);

    const reconciled = await recoveryService.reconcileStaleJobsOnStartup();
    expect(reconciled).toBe(0);
    expect(prisma.emailJob.update).not.toHaveBeenCalled();
    expect(enqueueEmailJob).not.toHaveBeenCalled();
  });

  it('should find stale PROCESSING jobs, reset to PENDING, and re-enqueue them', async () => {
    const staleJob = {
      id: 'stale_job_1',
      campaignId: 'camp_1',
      userId: 'user_1',
      recipient: 'interrupted@domain.com',
      subject: 'Subject',
      body: 'Body',
      scheduledAt: new Date(),
      status: EmailJobStatus.PROCESSING,
      updatedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
      campaign: {
        hourlyLimit: 100,
        delayBetweenEmailsMs: 2000,
      },
    };

    (prisma.emailJob.findMany as jest.Mock).mockResolvedValue([staleJob]);
    (prisma.emailJob.update as jest.Mock).mockResolvedValue({ ...staleJob, status: EmailJobStatus.PENDING });

    const count = await recoveryService.reconcileStaleJobsOnStartup(5 * 60 * 1000);

    expect(count).toBe(1);
    expect(prisma.emailJob.update).toHaveBeenCalledWith({
      where: { id: 'stale_job_1' },
      data: { status: EmailJobStatus.PENDING },
    });
    expect(enqueueEmailJob).toHaveBeenCalledWith(staleJob, {
      hourlyLimit: 100,
      delayBetweenEmailsMs: 2000,
    });
  });
});
