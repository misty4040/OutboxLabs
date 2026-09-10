import { getRedisClient } from '../queue/redis';
import { slackRepository } from '../repositories/slack.repository';
import { WebClient } from '@slack/web-api';

export class RateLimitNotifierService {
  /**
   * Dispatches a rate-limit warning to the user's Slack if connected.
   * Deduplicates by (userId, hourWindow) using Redis key so only 1 alert fires per window.
   */
  async notifyRateLimitEvent(
    userId: string,
    hourWindow: number,
    limit: number,
    nextWindowStart: Date
  ): Promise<boolean> {
    const redis = getRedisClient();
    const dedupeKey = `slack_notified:${userId}:${hourWindow}`;

    try {
      // Check if already notified in this window using SET NX EX 3600
      const isNew = await redis.set(dedupeKey, '1', 'EX', 3600, 'NX');
      if (!isNew) {
        // Already notified user for this hour window
        return false;
      }

      // Check if user has an active Slack connection
      const connection = await slackRepository.findByUserId(userId);
      if (!connection || !connection.accessToken) {
        console.log(
          `ℹ️ [Rate Limit Alert] User ${userId} hit hourly cap (${limit} emails/hr). No Slack connection configured; skipping notification.`
        );
        return false;
      }

      // Send message via Slack WebClient
      const client = new WebClient(connection.accessToken);
      const nextWindowFormatted = nextWindowStart.toLocaleTimeString();

      await client.chat.postMessage({
        channel: connection.slackUserId,
        text: `⚠️ *ReachInbox Rate Limit Reached*`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ Campaign Rate Limit Alert',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `You have reached your configured limit of *${limit} emails/hour* for the current window.\n\nRemaining jobs have been automatically delayed and will resume sending at *${nextWindowFormatted}*.`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Window ID: \`${hourWindow}\` • Zero jobs dropped.`,
              },
            ],
          },
        ],
      });

      console.log(`🔔 [Slack Alert] Dispatched rate-limit alert to user ${userId} on team ${connection.teamName}`);
      return true;
    } catch (error: any) {
      // Requirement: If error or no connection, skip without throwing
      console.error(`⚠️ Failed to dispatch Slack rate-limit alert for user ${userId}:`, error.message);
      return false;
    }
  }
}

export const rateLimitNotifierService = new RateLimitNotifierService();
