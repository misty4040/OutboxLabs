import request from 'supertest';
import { app } from '../app';
import { generateSessionToken } from '../utils/jwt';
import { userRepository } from '../repositories/user.repository';
import { emailJobRepository } from '../repositories/emailJob.repository';
import { elasticsearchService } from '../services/elasticsearch.service';
import { COOKIE_NAME } from '../middlewares/auth.middleware';
import { EmailJobStatus } from '@prisma/client';

jest.mock('../repositories/user.repository');
jest.mock('../repositories/emailJob.repository');
jest.mock('../services/elasticsearch.service', () => ({
  elasticsearchService: {
    searchEmails: jest.fn(),
  },
}));

describe('Phase 6: Email Query & Dashboard Stats Routes', () => {
  const mockUser = {
    id: 'user_queries_1',
    googleId: 'g_1',
    name: 'Query Tester',
    email: 'query@reachinbox.ai',
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

  it('GET /api/emails/scheduled should return paginated scheduled jobs', async () => {
    (emailJobRepository.findScheduledByUserId as jest.Mock).mockResolvedValue({
      jobs: [
        {
          id: 'job_sched_1',
          recipient: 'prospect@acme.com',
          status: EmailJobStatus.PENDING,
          scheduledAt: new Date(),
        },
      ],
      total: 1,
    });

    const res = await request(app)
      .get('/api/emails/scheduled?page=1&limit=10')
      .set('Cookie', [`${COOKIE_NAME}=${authToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobs).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
    expect(emailJobRepository.findScheduledByUserId).toHaveBeenCalledWith(
      mockUser.id,
      { page: 1, limit: 10 }
    );
  });

  it('GET /api/emails/sent should return paginated sent jobs', async () => {
    (emailJobRepository.findSentByUserId as jest.Mock).mockResolvedValue({
      jobs: [
        {
          id: 'job_sent_1',
          recipient: 'customer@acme.com',
          status: EmailJobStatus.SENT,
          sentAt: new Date(),
        },
      ],
      total: 1,
    });

    const res = await request(app)
      .get('/api/emails/sent')
      .set('Cookie', [`${COOKIE_NAME}=${authToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobs).toHaveLength(1);
    expect(emailJobRepository.findSentByUserId).toHaveBeenCalledWith(
      mockUser.id,
      { page: 1, limit: 20 }
    );
  });

  it('GET /api/dashboard/stats should return aggregated counts', async () => {
    (emailJobRepository.getStatsByUserId as jest.Mock).mockResolvedValue({
      scheduledCount: 15,
      sentCount: 42,
      failedCount: 1,
      rateLimitedCount: 3,
      totalCount: 58,
    });

    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Cookie', [`${COOKIE_NAME}=${authToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sentCount).toBe(42);
    expect(res.body.data.totalCount).toBe(58);
  });

  it('GET /api/emails/search should query Elasticsearch scoped to user', async () => {
    (elasticsearchService.searchEmails as jest.Mock).mockResolvedValue({
      hits: [
        {
          id: 'job_search_1',
          recipient: 'search@result.com',
          subject: 'Special Topic',
          status: 'SENT',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const res = await request(app)
      .get('/api/emails/search?q=Special&page=1&limit=20')
      .set('Cookie', [`${COOKIE_NAME}=${authToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hits).toHaveLength(1);
    expect(elasticsearchService.searchEmails).toHaveBeenCalledWith({
      userId: mockUser.id,
      query: 'Special',
      status: undefined,
      page: 1,
      limit: 20,
    });
  });
});
