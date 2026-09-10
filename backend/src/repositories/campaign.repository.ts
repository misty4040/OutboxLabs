import { prisma } from '../db/prisma';
import { Campaign, CampaignStatus } from '@prisma/client';

export class CampaignRepository {
  async create(data: {
    userId: string;
    subject: string;
    body: string;
    startTime: Date;
    delayBetweenEmailsMs: number;
    hourlyLimit: number;
  }): Promise<Campaign> {
    return prisma.campaign.create({
      data: {
        userId: data.userId,
        subject: data.subject,
        body: data.body,
        startTime: data.startTime,
        delayBetweenEmailsMs: data.delayBetweenEmailsMs,
        hourlyLimit: data.hourlyLimit,
        status: CampaignStatus.ACTIVE,
      },
    });
  }

  async findById(id: string, userId: string): Promise<Campaign | null> {
    return prisma.campaign.findFirst({
      where: {
        id,
        userId, // strict user scoping
      },
      include: {
        _count: {
          select: { emailJobs: true },
        },
      },
    });
  }

  async findManyByUserId(userId: string): Promise<Campaign[]> {
    return prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { emailJobs: true },
        },
      },
    });
  }

  async updateStatus(id: string, userId: string, status: CampaignStatus): Promise<Campaign> {
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
    });

    if (!campaign) {
      throw new Error('Campaign not found or unauthorized');
    }

    return prisma.campaign.update({
      where: { id },
      data: { status },
    });
  }
}

export const campaignRepository = new CampaignRepository();
