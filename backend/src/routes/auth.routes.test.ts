import request from 'supertest';
import { app } from '../app';
import { generateSessionToken } from '../utils/jwt';
import { userRepository } from '../repositories/user.repository';
import { COOKIE_NAME } from '../middlewares/auth.middleware';

// Mock dependencies
jest.mock('../repositories/user.repository');
jest.mock('../repositories/slack.repository', () => ({
  slackRepository: {
    findByUserId: jest.fn().mockResolvedValue(null),
  },
}));

describe('Phase 3: Authentication & Protected Routes', () => {
  const mockUser = {
    id: 'user_test_999',
    googleId: 'google_test_sub',
    name: 'Alice Developer',
    email: 'alice@reachinbox.ai',
    avatarUrl: 'https://avatar.url/alice.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('Protected Route: GET /auth/me', () => {
    it('should reject requests without a token with 401 Unauthorized', async () => {
      const res = await request(app).get('/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        success: false,
        message: 'Authentication required',
      });
    });

    it('should authenticate user with valid cookie', async () => {
      const token = generateSessionToken({
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      });

      const res = await request(app)
        .get('/auth/me')
        .set('Cookie', [`${COOKIE_NAME}=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockUser.id);
      expect(res.body.data.email).toBe(mockUser.email);
      expect(res.body.data.slackConnected).toBe(false);
    });

    it('should authenticate user with valid Authorization Bearer header', async () => {
      const token = generateSessionToken({
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      });

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockUser.id);
    });

    it('should reject requests with an invalid/tampered token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired session');
    });
  });

  describe('Session Management: POST /auth/logout', () => {
    it('should clear the reachinbox_token cookie', async () => {
      const res = await request(app).post('/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const setCookieHeader = res.header['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain(`${COOKIE_NAME}=;`);
    });
  });

  describe('OAuth Endpoint: POST /auth/google', () => {
    it('should return 400 when missing both code and idToken', async () => {
      const res = await request(app).post('/auth/google').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Either code or idToken is required');
    });
  });
});
