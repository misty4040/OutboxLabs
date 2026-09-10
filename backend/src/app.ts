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

  // CORS configured for credentials and frontend domain
  app.use(
    cors({
      origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
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

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'reachinbox-scheduler-api',
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
