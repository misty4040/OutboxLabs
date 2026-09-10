import request from 'supertest';
import { app } from '../app';
import { generateSessionToken } from '../utils/jwt';
import { userRepository } from '../repositories/user.repository';
import { slackRepository } from '../repositories/slack.repository';
import { COOKIE_NAME } from '../middlewares/auth.middleware';
import { WebClient } from '@slack/web-api';
import { env } from '../config/env';

jest.mock('../repositories/user.repository');
jest.mock('../repositories/slack.repository');
jest.mock('@slack/web-api');

describe('Phase 10: Slack OAuth Routes', () => {
  const mockUser = {
    id: 'user_slack_auth',
    googleId: 'g_slack',
    name: 'Slack User',
    email: 'slack@reachinbox.ai',
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

  describe('GET /api/slack/connect', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/slack/connect');
      expect(res.status).toBe(401);
    });

    it('should generate Slack authorize URL with user state when SLACK_CLIENT_ID is set', async () => {
      const originalClientId = env.SLACK_CLIENT_ID;
      (env as any).SLACK_CLIENT_ID = 'mock-slack-client-id';

      const res = await request(app)
        .get('/api/slack/connect')
        .set('Cookie', [`${COOKIE_NAME}=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toContain('https://slack.com/oauth/v2/authorize');
      expect(res.body.data.url).toContain('client_id=mock-slack-client-id');
      expect(res.body.data.url).toContain(`state=${mockUser.id}`);

      (env as any).SLACK_CLIENT_ID = originalClientId;
    });
  });

  describe('GET /api/slack/callback', () => {
    it('should exchange code for access token, persist encrypted token, and redirect to dashboard', async () => {
      const originalClientId = env.SLACK_CLIENT_ID;
      const originalSecret = env.SLACK_CLIENT_SECRET;
      (env as any).SLACK_CLIENT_ID = 'mock-client-id';
      (env as any).SLACK_CLIENT_SECRET = 'mock-secret';

      const mockAccess = jest.fn().mockResolvedValue({
        ok: true,
        access_token: 'mock_slack_bot_token_12345',
        authed_user: { id: 'U_TEST_USER' },
        team: { id: 'T_TEST_TEAM', name: 'ReachInbox Workspace' },
      });

      (WebClient as unknown as jest.Mock).mockImplementation(() => ({
        oauth: {
          v2: {
            access: mockAccess,
          },
        },
      }));

      (slackRepository.upsertConnection as jest.Mock).mockResolvedValue({});

      const res = await request(app).get(
        `/api/slack/callback?code=mock-slack-code&state=${mockUser.id}`
      );

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('/dashboard?slack=connected');
      expect(mockAccess).toHaveBeenCalledWith({
        client_id: 'mock-client-id',
        client_secret: 'mock-secret',
        code: 'mock-slack-code',
        redirect_uri: env.SLACK_REDIRECT_URI,
      });
      expect(slackRepository.upsertConnection).toHaveBeenCalledWith({
        userId: mockUser.id,
        slackUserId: 'U_TEST_USER',
        teamId: 'T_TEST_TEAM',
        teamName: 'ReachInbox Workspace',
        accessToken: 'mock_slack_bot_token_12345',
      });

      (env as any).SLACK_CLIENT_ID = originalClientId;
      (env as any).SLACK_CLIENT_SECRET = originalSecret;
    });
  });

  describe('POST /api/slack/disconnect', () => {
    it('should disconnect Slack integration for authenticated user', async () => {
      (slackRepository.deleteByUserId as jest.Mock).mockResolvedValue(true);

      const res = await request(app)
        .post('/api/slack/disconnect')
        .set('Cookie', [`${COOKIE_NAME}=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(slackRepository.deleteByUserId).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
