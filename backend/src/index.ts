import { app } from './app';
import { env } from './config/env';
import { initEmailWorker, closeEmailWorker } from './queue/emailWorker';
import { closeEmailQueue } from './queue/emailQueue';
import { recoveryService } from './services/recovery.service';
import { elasticsearchService } from './services/elasticsearch.service';

const startServer = async () => {
  try {
    const port = env.PORT || 5001;
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 ReachInbox Scheduler API running on port ${port}`);
      console.log(`🔧 Concurrency: ${env.WORKER_CONCURRENCY} | Delay: ${env.EMAIL_DELAY_MS}ms | Hourly Cap: ${env.MAX_EMAILS_PER_HOUR}`);
    });

    // Run background services asynchronously without blocking HTTP readiness
    elasticsearchService.initIndex().catch((err: any) => {
      console.warn(`⚠️ [Elasticsearch] Init skipped: ${err.message}`);
    });

    recoveryService.reconcileStaleJobsOnStartup().catch((err: any) => {
      console.warn(`⚠️ [Startup Recovery] Error: ${err.message}`);
    });

    try {
      initEmailWorker();
    } catch (err: any) {
      console.warn(`⚠️ [Worker] Worker init warning: ${err.message}`);
    }

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
