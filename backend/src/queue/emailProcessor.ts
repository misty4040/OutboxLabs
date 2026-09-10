import { Job } from 'bullmq';
import { EmailJobData, getEmailQueue } from './emailQueue';
import { emailSenderService } from '../services/emailSender.service';
import { emailJobRepository } from '../repositories/emailJob.repository';
import { rateLimiterService } from '../services/rateLimiter.service';
import { rateLimitNotifierService } from '../services/rateLimitNotifier.service';
import { elasticsearchService } from '../services/elasticsearch.service';
import { env } from '../config/env';

export const processEmailDispatchJob = async (job: Job<EmailJobData>): Promise<any> => {
  const { emailJobId, userId, recipient, subject, body, hourlyLimit } = job.data;

  // 1. Atomic Redis-backed Hourly Rate Limit Check
  const effectiveLimit = hourlyLimit || env.MAX_EMAILS_PER_HOUR;
  const rateLimitCheck = await rateLimiterService.checkAndIncrementHourlyLimit(
    userId,
    effectiveLimit
  );

  if (!rateLimitCheck.allowed) {
    const nextWindowStart = new Date(rateLimitCheck.nextWindowStartMs);
    console.log(
      `⏳ [Rate Limit Hit] Job ${emailJobId} for user ${userId} exceeded hourly limit of ${effectiveLimit}. Rescheduling for next window at ${nextWindowStart.toISOString()}`
    );

    // Update database status to RATE_LIMITED with next scheduledAt
    await emailJobRepository.markRateLimited(emailJobId, nextWindowStart);

    // Re-delay the BullMQ job to start of next window without failing the job
    try {
      if (job.token) {
        await job.moveToDelayed(rateLimitCheck.nextWindowStartMs, job.token);
      } else {
        const queue = getEmailQueue();
        await queue.add('send-email', job.data, {
          delay: rateLimitCheck.retryAfterMs,
        });
      }
    } catch (delayErr: any) {
      // Fallback: re-enqueue as a delayed job in the queue
      const queue = getEmailQueue();
      await queue.add('send-email', job.data, {
        delay: rateLimitCheck.retryAfterMs,
      });
    }

    // Fire deduped Slack notification (does not throw if no Slack connection)
    await rateLimitNotifierService.notifyRateLimitEvent(
      userId,
      rateLimitCheck.hourWindow,
      effectiveLimit,
      nextWindowStart
    );

    return {
      status: 'RATE_LIMITED',
      emailJobId,
      rescheduledFor: nextWindowStart,
      retryAfterMs: rateLimitCheck.retryAfterMs,
    };
  }

  // 2. Idempotent Atomic Database Claim Check
  // Guarantees zero double-sends even if two workers race on the same job
  const claimed = await emailJobRepository.claimJobForProcessing(emailJobId);
  if (!claimed) {
    console.log(
      `🔒 [Idempotent Claim] Job ${emailJobId} was already claimed or processed by another worker. Aborting send.`
    );
    return {
      status: 'ALREADY_PROCESSED',
      emailJobId,
      message: 'Job was already claimed or processed by another worker',
    };
  }

  // 3. Send email via SMTP (Ethereal)
  try {
    const result = await emailSenderService.sendEmail({
      to: recipient,
      subject,
      body,
    });

    // Mark job as SENT in database
    const sentAt = new Date();
    const updatedJob = await emailJobRepository.markSent(emailJobId, sentAt);

    // Sync state into Elasticsearch index
    await elasticsearchService.indexEmailJob(updatedJob);

    return {
      status: 'SENT',
      emailJobId,
      messageId: result.messageId,
      previewUrl: result.previewUrl,
      sentAt,
    };
  } catch (error: any) {
    console.error(`❌ Failed to send email for job ${emailJobId} to ${recipient}:`, error.message);

    // If max attempts reached or fatal error, mark as FAILED
    if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
      await emailJobRepository.markFailed(emailJobId, error.message, new Date());
    }

    throw error;
  }
};
