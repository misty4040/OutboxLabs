import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { sendError, sendSuccess } from './utils/response';
import { authRouter } from './routes/auth.routes';
import { campaignRouter } from './routes/campaign.routes';
import { emailRouter, dashboardRouter } from './routes/email.routes';
import { slackRouter } from './routes/slack.routes';
import { setupBullBoardRouter } from './routes/adminQueue.routes';

export const createApp = (): express.Application => {
  const app = express();

  app.set('trust proxy', 1);

  // CORS configured for credentials and frontend domain
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          origin === env.FRONTEND_URL ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.vercel.app') ||
          origin.endsWith('.up.railway.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Authentication routes
  app.use('/auth', authRouter);

  // Campaign routes
  app.use('/api/campaigns', campaignRouter);

  // Email & Dashboard routes
  app.use('/api/emails', emailRouter);
  app.use('/api/dashboard', dashboardRouter);

  // Slack OAuth routes
  app.use('/api/slack', slackRouter);

  // Bull Board Queue Dashboard (protected by requireAuth)
  app.use(setupBullBoardRouter());

  // Fast health checks for hosting platforms (Railway/Docker)
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'reachinbox-scheduler-api' });
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'reachinbox-scheduler-api' });
  });

  // Health check endpoint with Redis and DB diagnostics
  app.get('/api/health', async (_req: Request, res: Response) => {
    let redisStatus = 'unknown';
    try {
      const { getRedisClient } = await import('./queue/redis');
      const redis = getRedisClient();
      redisStatus = await redis.ping();
    } catch (e: any) {
      redisStatus = `error: ${e.message}`;
    }

    let dbStatus = 'unknown';
    try {
      const { prisma } = await import('./db/prisma');
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (e: any) {
      dbStatus = `error: ${e.message}`;
    }

    sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'reachinbox-scheduler-api',
      redis: redisStatus,
      database: dbStatus,
      environment: env.NODE_ENV,
    });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error caught in middleware:', err.message);
    const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    sendError(res, message, 500);
  });

  return app;
};

export const app = createApp();
