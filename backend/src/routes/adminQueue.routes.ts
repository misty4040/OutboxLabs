import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Router } from 'express';
import { getEmailQueue } from '../queue/emailQueue';
import { requireAuth } from '../middlewares/auth.middleware';

export const setupBullBoardRouter = (): Router => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  if (process.env.NODE_ENV !== 'test') {
    const emailQueue = getEmailQueue();
    createBullBoard({
      queues: [new BullMQAdapter(emailQueue)],
      serverAdapter,
    });
  } else {
    // In test environment, register Bull Board router without live Redis connection
    createBullBoard({
      queues: [],
      serverAdapter,
    });
  }

  const router = Router();

  // Protect Bull Board dashboard with requireAuth
  router.use('/admin/queues', requireAuth, serverAdapter.getRouter());

  return router;
};
