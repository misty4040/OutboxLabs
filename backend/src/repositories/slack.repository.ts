import { prisma } from '../db/prisma';
import { SlackConnection } from '@prisma/client';
import { encryptToken, decryptToken } from '../utils/crypto';

export interface DecryptedSlackConnection extends Omit<SlackConnection, 'accessToken'> {
  accessToken: string;
}

export class SlackRepository {
  async findByUserId(userId: string): Promise<DecryptedSlackConnection | null> {
    const conn = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!conn) return null;

    try {
      const decrypted = decryptToken(conn.accessToken);
      return {
        ...conn,
        accessToken: decrypted,
      };
    } catch (err) {
      console.error(`Failed to decrypt Slack access token for user ${userId}:`, err);
      return null;
    }
  }

  async upsertConnection(data: {
    userId: string;
    slackUserId: string;
    teamId: string;
    teamName?: string | null;
    accessToken: string;
  }): Promise<DecryptedSlackConnection> {
    const encryptedToken = encryptToken(data.accessToken);

    const record = await prisma.slackConnection.upsert({
      where: { userId: data.userId },
      update: {
        slackUserId: data.slackUserId,
        teamId: data.teamId,
        teamName: data.teamName,
        accessToken: encryptedToken,
      },
      create: {
        userId: data.userId,
        slackUserId: data.slackUserId,
        teamId: data.teamId,
        teamName: data.teamName,
        accessToken: encryptedToken,
      },
    });

    return {
      ...record,
      accessToken: data.accessToken,
    };
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    try {
      await prisma.slackConnection.delete({
        where: { userId },
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const slackRepository = new SlackRepository();
