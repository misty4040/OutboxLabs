import { prisma } from '../db/prisma';
import { Campaign, EmailJob, EmailJobStatus } from '@prisma/client';
import { env } from '../config/env';

export interface CreateCampaignInput {
  userId: string;
  subject: string;
  body: string;
  startTime?: string | Date;
  delayBetweenEmailsMs?: number;
  hourlyLimit?: number;
  recipients: string[];
}

export interface CreateCampaignResult {
  campaign: Campaign;
  jobsCount: number;
  firstScheduledAt: Date;
  lastScheduledAt: Date;
  jobs: EmailJob[];
}

export class CampaignService {
  /**
   * Validates and persists a campaign along with staggered email jobs in the database
   */
  async createCampaign(input: CreateCampaignInput): Promise<CreateCampaignResult> {
    const { userId, subject, body, recipients } = input;

    if (!subject || subject.trim() === '') {
      throw new Error('Email subject is required');
    }

    if (!body || body.trim() === '') {
      throw new Error('Email body is required');
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('At least one valid recipient is required');
    }

    const delayMs =
      input.delayBetweenEmailsMs !== undefined && input.delayBetweenEmailsMs >= 0
        ? input.delayBetweenEmailsMs
        : env.EMAIL_DELAY_MS;

    const hourlyCap =
      input.hourlyLimit !== undefined && input.hourlyLimit > 0
        ? input.hourlyLimit
        : env.MAX_EMAILS_PER_HOUR;

    let baseStartTime = input.startTime ? new Date(input.startTime) : new Date();
    if (isNaN(baseStartTime.getTime())) {
      throw new Error('Invalid start time provided');
    }

    // If start time is in the past, adjust to now
    const now = Date.now();
    if (baseStartTime.getTime() < now) {
      baseStartTime = new Date(now);
    }

    // Compute staggered schedule times for each recipient
    // targetSendTime = startTime + (index * delayBetweenEmailsMs)
    const baseTimeMs = baseStartTime.getTime();

    const jobsToCreate = recipients.map((recipient, index) => {
      const scheduledAt = new Date(baseTimeMs + index * delayMs);
      return {
        userId,
        recipient: recipient.trim().toLowerCase(),
        subject: subject.trim(),
        body: body.trim(),
        scheduledAt,
        status: EmailJobStatus.PENDING,
        attempts: 0,
      };
    });

    const firstScheduledAt = jobsToCreate[0].scheduledAt;
    const lastScheduledAt = jobsToCreate[jobsToCreate.length - 1].scheduledAt;

    // Persist campaign and jobs atomically in database
    const result = await prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          userId,
          subject: subject.trim(),
          body: body.trim(),
          startTime: baseStartTime,
          delayBetweenEmailsMs: delayMs,
          hourlyLimit: hourlyCap,
        },
      });

      // Attach campaignId to each job
      const emailJobsData = jobsToCreate.map((job) => ({
        ...job,
        campaignId: campaign.id,
      }));

      await tx.emailJob.createMany({
        data: emailJobsData,
      });

      // Retrieve created jobs
      const createdJobs = await tx.emailJob.findMany({
        where: { campaignId: campaign.id },
        orderBy: { scheduledAt: 'asc' },
      });

      return {
        campaign,
        jobs: createdJobs,
      };
    });

    return {
      campaign: result.campaign,
      jobsCount: result.jobs.length,
      firstScheduledAt,
      lastScheduledAt,
      jobs: result.jobs,
    };
  }
}

export const campaignService = new CampaignService();
