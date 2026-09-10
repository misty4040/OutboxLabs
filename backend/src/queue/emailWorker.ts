import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { getRedisClient } from './redis';
import { EMAIL_QUEUE_NAME, EmailJobData } from './emailQueue';
import { processEmailDispatchJob } from './emailProcessor';

export type JobProcessor = (job: Job<EmailJobData>) => Promise<any>;

let emailWorker: Worker<EmailJobData> | null = null;

let activeProcessor: JobProcessor = processEmailDispatchJob;

export const setEmailJobProcessor = (processor: JobProcessor): void => {
  activeProcessor = processor;
};

export const initEmailWorker = (): Worker<EmailJobData> => {
  if (!emailWorker) {
    emailWorker = new Worker<EmailJobData>(
      EMAIL_QUEUE_NAME,
      async (job: Job<EmailJobData>) => {
        return activeProcessor(job);
      },
      {
        connection: getRedisClient(),
        concurrency: env.WORKER_CONCURRENCY,
        lockDuration: 30000, // 30s lock duration
      }
    );

    emailWorker.on('completed', (job) => {
      console.log(`✅ [Worker] Job ${job.id} completed successfully`);
    });

    emailWorker.on('failed', (job, err) => {
      console.error(`❌ [Worker] Job ${job?.id} failed:`, err.message);
    });

    emailWorker.on('error', (err) => {
      console.error('❌ [Worker] Worker error event:', err.message);
    });

    console.log(`👷 Email worker initialized with concurrency: ${env.WORKER_CONCURRENCY}`);
  }

  return emailWorker;
};

export const getEmailWorker = (): Worker<EmailJobData> | null => {
  return emailWorker;
};

export const closeEmailWorker = async (): Promise<void> => {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
    console.log('👷 Email worker gracefully closed.');
  }
};
