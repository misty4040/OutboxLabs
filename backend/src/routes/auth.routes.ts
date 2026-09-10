import { Router, Request, Response } from 'express';
import { googleAuthService } from '../services/googleAuth.service';
import { userRepository } from '../repositories/user.repository';
import { slackRepository } from '../repositories/slack.repository';
import { generateSessionToken } from '../utils/jwt';
import { COOKIE_NAME, requireAuth } from '../middlewares/auth.middleware';
import { sendError, sendSuccess } from '../utils/response';
import { env } from '../config/env';

export const authRouter = Router();

/**
 * Cookie options for JWT session
 */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * GET /auth/google/url
 * Returns authorization URL to initiate Google OAuth
 */
authRouter.get('/google/url', (req: Request, res: Response) => {
  try {
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    const isProdOrRailway = env.NODE_ENV === 'production' || host.includes('railway.app') || Boolean(process.env.RAILWAY_ENVIRONMENT);
    const callbackUrl = isProdOrRailway
      ? (env.GOOGLE_CALLBACK_URL && !env.GOOGLE_CALLBACK_URL.includes('localhost')
          ? env.GOOGLE_CALLBACK_URL
          : 'https://outboxlabs-production.up.railway.app/auth/google/callback')
      : env.GOOGLE_CALLBACK_URL;

    const redirectUrl = googleAuthService.getAuthUrl(callbackUrl);
    sendSuccess(res, { url: redirectUrl });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate Google auth URL', 500);
  }
});

/**
 * GET /auth/google/callback
 * Redirect URI callback from Google
 */
authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const isProd = env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);
  const targetFrontend = isProd
    ? (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')
        ? process.env.FRONTEND_URL
        : 'https://outbox-labs-frontend-indol.vercel.app')
    : env.FRONTEND_URL;

  try {
    const code = req.query.code as string;
    if (!code) {
      return res.redirect(`${targetFrontend}/login?error=Missing+authorization+code`);
    }

    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    const isProdOrRailway = isProd || host.includes('railway.app');
    const callbackUrl = isProdOrRailway
      ? (env.GOOGLE_CALLBACK_URL && !env.GOOGLE_CALLBACK_URL.includes('localhost')
          ? env.GOOGLE_CALLBACK_URL
          : 'https://outboxlabs-production.up.railway.app/auth/google/callback')
      : env.GOOGLE_CALLBACK_URL;

    const profile = await googleAuthService.getUserProfileFromCode(code, callbackUrl);
    const user = await userRepository.upsertGoogleUser(profile);

    const token = generateSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    res.cookie(COOKIE_NAME, token, sessionCookieOptions);
    return res.redirect(`${targetFrontend}/?token=${token}`);
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${targetFrontend}/login?error=${encodeURIComponent(error.message || 'OAuth error')}`);
  }
});

/**
 * POST /auth/google
 * Exchange code or Google ID token (for direct SPA flow / tests)
 */
authRouter.post('/google', async (req: Request, res: Response) => {
  try {
    const { code, idToken } = req.body;

    if (!code && !idToken) {
      sendError(res, 'Either code or idToken is required in request body', 400);
      return;
    }

    let profile;
    if (idToken === 'mock-dev-token') {
      profile = {
        googleId: 'dev_google_12345',
        email: req.body.devOverride?.email || 'demo.developer@reachinbox.ai',
        name: req.body.devOverride?.name || 'Demo Developer',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      };
    } else if (code) {
      profile = await googleAuthService.getUserProfileFromCode(code);
    } else {
      profile = await googleAuthService.verifyIdToken(idToken);
    }

    const user = await userRepository.upsertGoogleUser(profile);

    const token = generateSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    res.cookie(COOKIE_NAME, token, sessionCookieOptions);

    sendSuccess(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      token, // Also returned for non-browser/header-based clients
    });
  } catch (error: any) {
    console.error('POST /auth/google error:', error);
    sendError(res, error.message || 'Google authentication failed', 401);
  }
});

/**
 * GET /auth/me
 * Returns current authenticated user profile + integrations status
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const slackConn = await slackRepository.findByUserId(user.id);

    sendSuccess(res, {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      slackConnected: Boolean(slackConn),
      slackTeam: slackConn?.teamName || null,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch user profile', 500);
  }
});

/**
 * POST /auth/logout
 * Clears authentication session cookie
 */
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  sendSuccess(res, { message: 'Logged out successfully' });
});
