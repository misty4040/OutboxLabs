import { campaignService } from './campaign.service';
import { prisma } from '../db/prisma';
import { CampaignStatus, EmailJobStatus } from '@prisma/client';

// Mock prisma transaction
jest.mock('../db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

describe('Phase 4: Campaign Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should reject campaign creation with missing subject or body', async () => {
    await expect(
      campaignService.createCampaign({
        userId: 'user_1',
        subject: '',
        body: 'Hello',
        recipients: ['test@example.com'],
      })
    ).rejects.toThrow('Email subject is required');

    await expect(
      campaignService.createCampaign({
        userId: 'user_1',
        subject: 'Subject',
        body: '  ',
        recipients: ['test@example.com'],
      })
    ).rejects.toThrow('Email body is required');
  });

  it('should reject campaign creation without recipients', async () => {
    await expect(
      campaignService.createCampaign({
        userId: 'user_1',
        subject: 'Subject',
        body: 'Body',
        recipients: [],
      })
    ).rejects.toThrow('At least one valid recipient is required');
  });

  it('should calculate staggered schedule times per recipient and persist', async () => {
    const startTime = new Date(Date.now() + 10000);
    const delayMs = 3000;
    const recipients = ['r1@domain.com', 'r2@domain.com', 'r3@domain.com'];

    const mockCampaign = {
      id: 'camp_123',
      userId: 'user_1',
      subject: 'Test Pitch',
      body: 'Hello World',
      startTime,
      delayBetweenEmailsMs: delayMs,
      hourlyLimit: 100,
      status: CampaignStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockJobs = recipients.map((r, i) => ({
      id: `job_${i + 1}`,
      campaignId: 'camp_123',
      userId: 'user_1',
      recipient: r,
      subject: 'Test Pitch',
      body: 'Hello World',
      scheduledAt: new Date(startTime.getTime() + i * delayMs),
      status: EmailJobStatus.PENDING,
      attempts: 0,
      sentAt: null,
      failedAt: null,
      errorMessage: null,
      bullJobId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const tx = {
        campaign: {
          create: jest.fn().mockResolvedValue(mockCampaign),
        },
        emailJob: {
          createMany: jest.fn().mockResolvedValue({ count: recipients.length }),
          findMany: jest.fn().mockResolvedValue(mockJobs),
        },
      };
      return callback(tx);
    });

    const result = await campaignService.createCampaign({
      userId: 'user_1',
      subject: 'Test Pitch',
      body: 'Hello World',
      startTime,
      delayBetweenEmailsMs: delayMs,
      hourlyLimit: 100,
      recipients,
    });

    expect(result.jobsCount).toBe(3);
    expect(result.firstScheduledAt.getTime()).toBe(startTime.getTime());
    expect(result.lastScheduledAt.getTime()).toBe(startTime.getTime() + 2 * delayMs);
    expect(result.jobs[1].scheduledAt.getTime()).toBe(startTime.getTime() + delayMs);
  });
});
