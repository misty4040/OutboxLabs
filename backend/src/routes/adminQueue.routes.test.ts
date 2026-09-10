import request from 'supertest';
import { app } from '../app';
import { generateSessionToken } from '../utils/jwt';
import { userRepository } from '../repositories/user.repository';
import { COOKIE_NAME } from '../middlewares/auth.middleware';

jest.mock('../repositories/user.repository');
jest.mock('../queue/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({}),
}));

describe('Phase 11: Bull Board Admin Queue Route Protection', () => {
  const mockUser = {
    id: 'user_admin_1',
    googleId: 'g_admin',
    name: 'Admin User',
    email: 'admin@reachinbox.ai',
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

  it('GET /admin/queues should reject unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/admin/queues');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Authentication required');
  });

  it('GET /admin/queues should grant access to authenticated user', async () => {
    const res = await request(app)
      .get('/admin/queues')
      .set('Cookie', [`${COOKIE_NAME}=${authToken}`]);

    // Bull Board responds with 200 or 302/301 redirect to /admin/queues/
    expect([200, 301, 302]).toContain(res.status);
  });
});
