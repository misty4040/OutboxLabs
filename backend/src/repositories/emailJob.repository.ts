import { prisma } from '../db/prisma';
import { EmailJob, EmailJobStatus, Prisma } from '@prisma/client';

export class EmailJobRepository {
  /**
   * Batch insert email jobs for a campaign
   */
  async createMany(jobs: Prisma.EmailJobCreateManyInput[]): Promise<number> {
    const result = await prisma.emailJob.createMany({
      data: jobs,
    });
    return result.count;
  }

  async findById(id: string, userId?: string): Promise<EmailJob | null> {
    return prisma.emailJob.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
      },
      include: {
        campaign: true,
      },
    });
  }

  async findByBullJobId(bullJobId: string): Promise<EmailJob | null> {
    return prisma.emailJob.findFirst({
      where: { bullJobId },
    });
  }

  /**
   * Idempotent atomic claim before sending.
   * Guarantees zero double-sends even under concurrent workers racing for the same job.
   * Returns true if successfully claimed, false if already claimed or sent.
   */
  async claimJobForProcessing(id: string): Promise<boolean> {
    const result = await prisma.$executeRaw`
      UPDATE EmailJob
      SET status = 'PROCESSING', attempts = attempts + 1, updatedAt = NOW()
      WHERE id = ${id} AND status IN ('PENDING', 'DELAYED', 'RATE_LIMITED')
    `;
    return result > 0;
  }

  async markSent(id: string, sentAt: Date = new Date()): Promise<EmailJob> {
    return prisma.emailJob.update({
      where: { id },
      data: {
        status: EmailJobStatus.SENT,
        sentAt,
        errorMessage: null,
      },
    });
  }

  async markFailed(id: string, errorMessage: string, failedAt: Date = new Date()): Promise<EmailJob> {
    return prisma.emailJob.update({
      where: { id },
      data: {
        status: EmailJobStatus.FAILED,
        failedAt,
        errorMessage,
      },
    });
  }

  async markRateLimited(id: string, nextScheduledAt: Date): Promise<EmailJob> {
    return prisma.emailJob.update({
      where: { id },
      data: {
        status: EmailJobStatus.RATE_LIMITED,
        scheduledAt: nextScheduledAt,
      },
    });
  }

  async updateBullJobId(id: string, bullJobId: string): Promise<EmailJob> {
    return prisma.emailJob.update({
      where: { id },
      data: {
        bullJobId,
        status: EmailJobStatus.DELAYED,
      },
    });
  }

  /**
   * Retrieve scheduled emails (PENDING, DELAYED, RATE_LIMITED) for a user
   */
  async findScheduledByUserId(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ jobs: EmailJob[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EmailJobWhereInput = {
      userId,
      status: {
        in: [EmailJobStatus.PENDING, EmailJobStatus.DELAYED, EmailJobStatus.RATE_LIMITED, EmailJobStatus.PROCESSING],
      },
    };

    const [jobs, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.emailJob.count({ where }),
    ]);

    return { jobs, total };
  }

  /**
   * Retrieve sent emails for a user
   */
  async findSentByUserId(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ jobs: EmailJob[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EmailJobWhereInput = {
      userId,
      status: EmailJobStatus.SENT,
    };

    const [jobs, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.emailJob.count({ where }),
    ]);

    return { jobs, total };
  }

  /**
   * Aggregate stats for user dashboard
   */
  async getStatsByUserId(userId: string): Promise<{
    scheduledCount: number;
    sentCount: number;
    failedCount: number;
    rateLimitedCount: number;
    totalCount: number;
  }> {
    const counts = await prisma.emailJob.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });

    let scheduledCount = 0;
    let sentCount = 0;
    let failedCount = 0;
    let rateLimitedCount = 0;
    let totalCount = 0;

    for (const item of counts) {
      const count = item._count._all;
      totalCount += count;
      if (
        item.status === EmailJobStatus.PENDING ||
        item.status === EmailJobStatus.DELAYED ||
        item.status === EmailJobStatus.PROCESSING
      ) {
        scheduledCount += count;
      } else if (item.status === EmailJobStatus.SENT) {
        sentCount += count;
      } else if (item.status === EmailJobStatus.FAILED) {
        failedCount += count;
      } else if (item.status === EmailJobStatus.RATE_LIMITED) {
        rateLimitedCount += count;
        scheduledCount += count;
      }
    }

    return {
      scheduledCount,
      sentCount,
      failedCount,
      rateLimitedCount,
      totalCount,
    };
  }

  /**
   * Recovery check: find jobs stuck in PROCESSING past a given threshold
   */
  async findStaleProcessingJobs(staleBefore: Date): Promise<EmailJob[]> {
    return prisma.emailJob.findMany({
      where: {
        status: EmailJobStatus.PROCESSING,
        updatedAt: {
          lt: staleBefore,
        },
      },
    });
  }
}

export const emailJobRepository = new EmailJobRepository();
