import { prisma } from '../db/prisma';
import { EmailJobStatus } from '@prisma/client';
import { enqueueEmailJob } from '../queue/emailQueue';

export class RecoveryService {
  /**
   * Startup reconciliation check.
   * Finds jobs stuck in PROCESSING past a timeout threshold due to prior server crashes or restarts,
   * resets them to PENDING, and re-enqueues them into BullMQ.
   */
  async reconcileStaleJobsOnStartup(staleThresholdMs = 15 * 1000): Promise<number> {
    const staleBefore = new Date(Date.now() - staleThresholdMs);

    try {
      const staleJobs = await prisma.emailJob.findMany({
        where: {
          status: EmailJobStatus.PROCESSING,
          updatedAt: {
            lt: staleBefore,
          },
        },
        include: {
          campaign: true,
        },
      });

      if (staleJobs.length === 0) {
        console.log('🔄 [Startup Recovery] All email jobs clean. No stale PROCESSING jobs found.');
        return 0;
      }

      console.warn(
        `⚠️ [Startup Recovery] Found ${staleJobs.length} job(s) stuck in PROCESSING from an interrupted run. Reconciling...`
      );

      for (const job of staleJobs) {
        // Reset status to PENDING
        await prisma.emailJob.update({
          where: { id: job.id },
          data: {
            status: EmailJobStatus.PENDING,
          },
        });

        // Re-enqueue into BullMQ
        await enqueueEmailJob(job, {
          hourlyLimit: job.campaign.hourlyLimit,
          delayBetweenEmailsMs: job.campaign.delayBetweenEmailsMs,
        });

        console.log(`✅ [Startup Recovery] Successfully reconciled and re-enqueued job ${job.id}`);
      }

      return staleJobs.length;
    } catch (error: any) {
      console.error('❌ [Startup Recovery] Error during job reconciliation:', error.message);
      return 0;
    }
  }
}

export const recoveryService = new RecoveryService();
