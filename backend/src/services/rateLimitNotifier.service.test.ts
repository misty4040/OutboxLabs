import { rateLimitNotifierService } from './rateLimitNotifier.service';
import { getRedisClient } from '../queue/redis';
import { slackRepository } from '../repositories/slack.repository';
import { WebClient } from '@slack/web-api';

jest.mock('../queue/redis');
jest.mock('../repositories/slack.repository');
jest.mock('@slack/web-api');

describe('Phase 10: Slack Rate Limit Notifier Service', () => {
  const mockSet = jest.fn();
  const mockPostMessage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockReturnValue({
      set: mockSet,
    });
    (WebClient as unknown as jest.Mock).mockImplementation(() => ({
      chat: {
        postMessage: mockPostMessage,
      },
    }));
  });

  it('should dispatch alert to Slack on first occurrence in hourWindow', async () => {
    // Redis SET NX returns 'OK' for new key
    mockSet.mockResolvedValue('OK');
    (slackRepository.findByUserId as jest.Mock).mockResolvedValue({
      userId: 'user_slack_1',
      slackUserId: 'U_SLACK_123',
      teamId: 'T_123',
      teamName: 'Acme Corp',
      accessToken: 'test_decrypted_bot_token_123',
    });
    mockPostMessage.mockResolvedValue({ ok: true });

    const nextWindow = new Date(Date.now() + 30 * 60 * 1000);
    const sent = await rateLimitNotifierService.notifyRateLimitEvent(
      'user_slack_1',
      100,
      200,
      nextWindow
    );

    expect(sent).toBe(true);
    expect(mockSet).toHaveBeenCalledWith('slack_notified:user_slack_1:100', '1', 'EX', 3600, 'NX');
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'U_SLACK_123',
        text: expect.stringContaining('Rate Limit Reached'),
      })
    );
  });

  it('should deduplicate and skip Slack dispatch if already notified in this window', async () => {
    // Redis SET NX returns null when key already exists
    mockSet.mockResolvedValue(null);

    const nextWindow = new Date(Date.now() + 30 * 60 * 1000);
    const sent = await rateLimitNotifierService.notifyRateLimitEvent(
      'user_slack_1',
      100,
      200,
      nextWindow
    );

    expect(sent).toBe(false);
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('should gracefully skip without throwing if user has no Slack connection', async () => {
    mockSet.mockResolvedValue('OK');
    (slackRepository.findByUserId as jest.Mock).mockResolvedValue(null);

    const nextWindow = new Date(Date.now() + 30 * 60 * 1000);
    const sent = await rateLimitNotifierService.notifyRateLimitEvent(
      'user_no_slack',
      101,
      200,
      nextWindow
    );

    expect(sent).toBe(false);
    expect(mockPostMessage).not.toHaveBeenCalled();
  });
});
