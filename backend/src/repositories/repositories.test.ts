import { userRepository } from './user.repository';
import { campaignRepository } from './campaign.repository';
import { emailJobRepository } from './emailJob.repository';
import { slackRepository } from './slack.repository';
import { prisma } from '../db/prisma';
import { EmailJobStatus, CampaignStatus } from '@prisma/client';

// Mock prisma for isolated unit tests without requiring active DB connection
jest.mock('../db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    campaign: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    emailJob: {
      createMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    slackConnection: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    $executeRaw: jest.fn(),
  },
}));

describe('Phase 2: Repository Layer Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('UserRepository', () => {
    it('should upsert google user successfully', async () => {
      const mockUser = {
        id: 'user_123',
        googleId: 'google_abc',
        email: 'dev@reachinbox.ai',
        name: 'ReachInbox Dev',
        avatarUrl: 'https://example.com/avatar.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.upsert as jest.Mock).mockResolvedValue(mockUser);

      const result = await userRepository.upsertGoogleUser({
        googleId: 'google_abc',
        email: 'dev@reachinbox.ai',
        name: 'ReachInbox Dev',
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { googleId: 'google_abc' },
        update: {
          email: 'dev@reachinbox.ai',
          name: 'ReachInbox Dev',
          avatarUrl: 'https://example.com/avatar.png',
        },
        create: {
          googleId: 'google_abc',
          email: 'dev@reachinbox.ai',
          name: 'ReachInbox Dev',
          avatarUrl: 'https://example.com/avatar.png',
        },
      });
      expect(result.id).toBe('user_123');
    });
  });

  describe('EmailJobRepository', () => {
    it('claimJobForProcessing should return true when updateMany affects 1 row', async () => {
      (prisma.emailJob.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const claimed = await emailJobRepository.claimJobForProcessing('job_123');
      expect(prisma.emailJob.updateMany).toHaveBeenCalled();
      expect(claimed).toBe(true);
    });

    it('claimJobForProcessing should return false when updateMany affects 0 rows (already claimed/sent)', async () => {
      (prisma.emailJob.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const claimed = await emailJobRepository.claimJobForProcessing('job_123');
      expect(prisma.emailJob.updateMany).toHaveBeenCalled();
      expect(claimed).toBe(false);
    });

    it('getStatsByUserId should aggregate counts correctly', async () => {
      (prisma.emailJob.groupBy as jest.Mock).mockResolvedValue([
        { status: EmailJobStatus.PENDING, _count: { _all: 10 } },
        { status: EmailJobStatus.SENT, _count: { _all: 50 } },
        { status: EmailJobStatus.FAILED, _count: { _all: 2 } },
        { status: EmailJobStatus.RATE_LIMITED, _count: { _all: 5 } },
      ]);

      const stats = await emailJobRepository.getStatsByUserId('user_123');
      expect(stats.totalCount).toBe(67);
      expect(stats.sentCount).toBe(50);
      expect(stats.failedCount).toBe(2);
      expect(stats.rateLimitedCount).toBe(5);
      // PENDING + RATE_LIMITED = 15 scheduled
      expect(stats.scheduledCount).toBe(15);
    });
  });

  describe('SlackRepository', () => {
    it('should encrypt access token before saving and decrypt on retrieval', async () => {
      const plainToken = 'mock_slack_token_test';

      (prisma.slackConnection.upsert as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({
          id: 'conn_123',
          userId: args.where.userId,
          slackUserId: args.create.slackUserId,
          teamId: args.create.teamId,
          teamName: args.create.teamName,
          accessToken: args.create.accessToken, // encrypted token
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const upserted = await slackRepository.upsertConnection({
        userId: 'user_123',
        slackUserId: 'U12345',
        teamId: 'T12345',
        accessToken: plainToken,
      });

      expect(upserted.accessToken).toBe(plainToken);

      // Now mock retrieval with the encrypted token in DB
      const encryptedInDb = (prisma.slackConnection.upsert as jest.Mock).mock.calls[0][0].create.accessToken;
      (prisma.slackConnection.findUnique as jest.Mock).mockResolvedValue({
        id: 'conn_123',
        userId: 'user_123',
        slackUserId: 'U12345',
        teamId: 'T12345',
        teamName: 'ReachTeam',
        accessToken: encryptedInDb,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const retrieved = await slackRepository.findByUserId('user_123');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.accessToken).toBe(plainToken);
    });
  });
});
