import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { emailJobRepository } from '../repositories/emailJob.repository';
import { elasticsearchService } from '../services/elasticsearch.service';
import { sendError, sendSuccess } from '../utils/response';

export const emailRouter = Router();

// Require authentication on all email routes
emailRouter.use(requireAuth);

/**
 * GET /api/emails/scheduled
 * Paginated list of scheduled/delayed/rate-limited emails for authenticated user
 */
emailRouter.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await emailJobRepository.findScheduledByUserId(user.id, { page, limit });

    sendSuccess(res, {
      jobs: result.jobs,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve scheduled emails', 500);
  }
});

/**
 * GET /api/emails/sent
 * Paginated list of sent emails for authenticated user
 */
emailRouter.get('/sent', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await emailJobRepository.findSentByUserId(user.id, { page, limit });

    sendSuccess(res, {
      jobs: result.jobs,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve sent emails', 500);
  }
});

/**
 * GET /api/emails/search
 * Elasticsearch-backed search for emails strictly scoped to authenticated user
 */
emailRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const q = req.query.q as string;
    const status = req.query.status as string;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await elasticsearchService.searchEmails({
      userId: user.id,
      query: q,
      status,
      page,
      limit,
    });

    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, error.message || 'Search failed', 500);
  }
});

/**
 * GET /api/emails/:id
 * Retrieve a single email job by ID
 */
emailRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const job = await emailJobRepository.findById(req.params.id, user.id);

    if (!job) {
      sendError(res, 'Email job not found', 404);
      return;
    }

    sendSuccess(res, job);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve email job', 500);
  }
});

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

/**
 * GET /api/dashboard/stats
 * Aggregated stats for the user dashboard
 */
dashboardRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const stats = await emailJobRepository.getStatsByUserId(user.id);
    sendSuccess(res, stats);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve dashboard stats', 500);
  }
});
