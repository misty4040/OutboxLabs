import { Router, Request, Response } from 'express';
import { WebClient } from '@slack/web-api';
import { requireAuth } from '../middlewares/auth.middleware';
import { slackRepository } from '../repositories/slack.repository';
import { sendError, sendSuccess } from '../utils/response';
import { env } from '../config/env';

export const slackRouter = Router();

const SLACK_OAUTH_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_SCOPES = ['chat:write', 'channels:read', 'groups:read'].join(',');

/**
 * GET /api/slack/connect
 * Initiates Slack OAuth flow by generating authorization URL
 */
slackRouter.get('/connect', requireAuth, (req: Request, res: Response): void => {
  try {
    if (!env.SLACK_CLIENT_ID) {
      sendError(res, 'SLACK_CLIENT_ID is not configured in environment', 500);
      return;
    }

    const user = req.user!;
    const state = user.id; // Scoped state parameter to identify user upon redirect

    const params = new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      scope: SLACK_SCOPES,
      redirect_uri: env.SLACK_REDIRECT_URI,
      state,
    });

    const authorizeUrl = `${SLACK_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
    sendSuccess(res, { url: authorizeUrl });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to initiate Slack OAuth', 500);
  }
});

/**
 * GET /api/slack/callback
 * Redirect handler from Slack OAuth exchange
 */
slackRouter.get('/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string; // user.id passed in state
    const error = req.query.error as string;

    if (error) {
      return res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&reason=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&reason=Missing+code+or+state`);
    }

    if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
      return res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&reason=Slack+credentials+missing`);
    }

    const client = new WebClient();
    const response = await client.oauth.v2.access({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: env.SLACK_REDIRECT_URI,
    });

    if (!response.ok || !response.access_token) {
      const errMsg = response.error || 'Slack token exchange failed';
      return res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&reason=${encodeURIComponent(errMsg)}`);
    }

    const slackUserId = response.authed_user?.id || (response as any).bot_user_id || 'unknown';
    const teamId = response.team?.id || 'unknown';
    const teamName = response.team?.name || 'Slack Workspace';

    // Store encrypted access token at rest
    await slackRepository.upsertConnection({
      userId: state,
      slackUserId,
      teamId,
      teamName,
      accessToken: response.access_token,
    });

    console.log(`✅ Successfully connected Slack for user ${state} on workspace ${teamName} (${teamId})`);
    return res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (err: any) {
    console.error('Slack OAuth callback error:', err);
    return res.redirect(
      `${env.FRONTEND_URL}/dashboard?slack=error&reason=${encodeURIComponent(err.message || 'OAuth error')}`
    );
  }
});

/**
 * POST /api/slack/disconnect
 * Disconnects and revokes user's Slack connection
 */
slackRouter.post('/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const deleted = await slackRepository.deleteByUserId(user.id);

    if (deleted) {
      sendSuccess(res, { message: 'Slack disconnected successfully' });
    } else {
      sendSuccess(res, { message: 'No active Slack connection found' });
    }
  } catch (error: any) {
    sendError(res, error.message || 'Failed to disconnect Slack', 500);
  }
});
