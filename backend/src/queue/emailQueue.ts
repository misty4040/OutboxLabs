import { Queue, QueueOptions } from 'bullmq';
import { env } from '../config/env';
import { getRedisClient } from './redis';
import { EmailJob, Campaign } from '@prisma/client';
import { emailJobRepository } from '../repositories/emailJob.repository';

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

export interface EmailJobData {
  emailJobId: string;
  campaignId: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  hourlyLimit: number;
  delayBetweenEmailsMs: number;
}

let emailQueue: Queue<EmailJobData> | null = null;

export const getEmailQueue = (): Queue<EmailJobData> => {
  if (!emailQueue) {
    const queueOptions: QueueOptions = {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600, // keep completed jobs for 24 hours
          count: 5000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // keep failed jobs for 7 days
        },
      },
    };

    emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, queueOptions);
  }
  return emailQueue;
};

/**
 * Calculates delayed duration in milliseconds from scheduledAt timestamp
 */
export const calculateJobDelayMs = (scheduledAt: Date | string, currentTimeMs = Date.now()): number => {
  const targetTimeMs = new Date(scheduledAt).getTime();
  return Math.max(0, targetTimeMs - currentTimeMs);
};

/**
 * Adds a single EmailJob to the BullMQ queue with computed delay and custom jobId
 */
export const enqueueEmailJob = async (
  job: EmailJob,
  campaign: { hourlyLimit: number; delayBetweenEmailsMs: number }
): Promise<string> => {
  const queue = getEmailQueue();
  const delayMs = calculateJobDelayMs(job.scheduledAt);

  const jobData: EmailJobData = {
    emailJobId: job.id,
    campaignId: job.campaignId,
    userId: job.userId,
    recipient: job.recipient,
    subject: job.subject,
    body: job.body,
    scheduledAt: job.scheduledAt.toISOString(),
    hourlyLimit: campaign.hourlyLimit,
    delayBetweenEmailsMs: campaign.delayBetweenEmailsMs,
  };

  // Use the database record ID as BullMQ jobId to guarantee uniqueness and prevent duplicate jobs
  const bullJob = await queue.add('send-email', jobData, {
    jobId: job.id,
    delay: delayMs,
  });

  const bullJobId = bullJob.id || job.id;
  await emailJobRepository.updateBullJobId(job.id, bullJobId);

  return bullJobId;
};

/**
 * Enqueues a batch of EmailJobs created for a campaign
 */
export const scheduleCampaignJobs = async (
  campaign: Campaign,
  jobs: EmailJob[]
): Promise<number> => {
  for (const job of jobs) {
    await enqueueEmailJob(job, {
      hourlyLimit: campaign.hourlyLimit,
      delayBetweenEmailsMs: campaign.delayBetweenEmailsMs,
    });
  }
  return jobs.length;
};

export const closeEmailQueue = async (): Promise<void> => {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
  }
};
