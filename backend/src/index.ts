import { app } from './app';
import { env } from './config/env';
import { initEmailWorker, closeEmailWorker } from './queue/emailWorker';
import { closeEmailQueue } from './queue/emailQueue';
import { recoveryService } from './services/recovery.service';
import { elasticsearchService } from './services/elasticsearch.service';

const startServer = async () => {
  try {
    // 1. Initialize Elasticsearch index mapping
    await elasticsearchService.initIndex();

    // 2. Reconcile any stale PROCESSING jobs on boot
    await recoveryService.reconcileStaleJobsOnStartup();

    // 3. Initialize BullMQ background email worker
    initEmailWorker();

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 ReachInbox Scheduler API running on http://localhost:${env.PORT}`);
      console.log(`🔧 Concurrency: ${env.WORKER_CONCURRENCY} | Delay: ${env.EMAIL_DELAY_MS}ms | Hourly Cap: ${env.MAX_EMAILS_PER_HOUR}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down...`);
      await closeEmailWorker();
      await closeEmailQueue();
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Fatal startup error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}
