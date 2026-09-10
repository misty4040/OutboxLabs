import request from 'supertest';
import { app } from '../app';
import { generateSessionToken } from '../utils/jwt';
import { userRepository } from '../repositories/user.repository';
import { campaignService } from '../services/campaign.service';
import { campaignRepository } from '../repositories/campaign.repository';
import { COOKIE_NAME } from '../middlewares/auth.middleware';
import { CampaignStatus } from '@prisma/client';

jest.mock('../repositories/user.repository');
jest.mock('../services/campaign.service');
jest.mock('../repositories/campaign.repository');
jest.mock('../queue/emailQueue', () => ({
  scheduleCampaignJobs: jest.fn().mockResolvedValue(2),
  getEmailQueue: jest.fn().mockReturnValue({}),
}));

describe('Phase 4: Campaign Routes', () => {
  const mockUser = {
    id: 'user_auth_123',
    googleId: 'google_user_123',
    name: 'Campaign Tester',
    email: 'tester@reachinbox.ai',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const authToken = generateSessionToken({
    userId: mockUser.id,
    email: mockUser.email,
    name: mockUser.name,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('POST /api/campaigns/parse-leads', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/campaigns/parse-leads')
        .send({ emails: ['a@b.com'] });

      expect(res.status).toBe(401);
    });

    it('should parse email array for authenticated user', async () => {
      const res = await request(app)
        .post('/api/campaigns/parse-leads')
        .set('Cookie', [`${COOKIE_NAME}=${authToken}`])
        .send({ emails: ['user1@test.com', 'user2@test.com', 'user1@test.com', 'invalid-email'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.validCount).toBe(2);
      expect(res.body.data.duplicateCount).toBe(1);
      expect(res.body.data.invalidCount).toBe(1);
    });
  });

  describe('POST /api/campaigns', () => {
    it('should create campaign and return persisted jobs summary', async () => {
      const mockResult = {
        campaign: {
          id: 'camp_777',
          userId: mockUser.id,
          subject: 'Welcome',
          body: 'Hi there',
          startTime: new Date(),
          delayBetweenEmailsMs: 2000,
          hourlyLimit: 200,
          status: CampaignStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        jobsCount: 2,
        firstScheduledAt: new Date(),
        lastScheduledAt: new Date(Date.now() + 2000),
        jobs: [],
      };

      (campaignService.createCampaign as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app)
        .post('/api/campaigns')
        .set('Cookie', [`${COOKIE_NAME}=${authToken}`])
        .send({
          subject: 'Welcome',
          body: 'Hi there',
          recipients: ['lead1@test.com', 'lead2@test.com'],
          delayBetweenEmailsMs: 2000,
          hourlyLimit: 200,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.campaign.id).toBe('camp_777');
      expect(res.body.data.jobsCount).toBe(2);
    });
  });

  describe('GET /api/campaigns', () => {
    it('should list campaigns scoped to user', async () => {
      (campaignRepository.findManyByUserId as jest.Mock).mockResolvedValue([
        { id: 'camp_1', subject: 'Campaign 1', userId: mockUser.id },
      ]);

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', [`${COOKIE_NAME}=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(campaignRepository.findManyByUserId).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
