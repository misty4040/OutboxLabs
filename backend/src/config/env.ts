import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from root or backend directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5001),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  
  // Database & Storage
  DATABASE_URL: z.string().default('mysql://root:rootpassword@127.0.0.1:3306/reachinbox'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  ELASTICSEARCH_URL: z.string().default('http://127.0.0.1:9200'),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5001/auth/google/callback'),
  
  // Slack OAuth
  SLACK_CLIENT_ID: z.string().optional().default(''),
  SLACK_CLIENT_SECRET: z.string().optional().default(''),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:5001/api/slack/callback'),
  
  // SMTP / Ethereal
  SMTP_HOST: z.string().default('smtp.ethereal.email'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM: z.string().default('"ReachInbox Outreach" <no-reply@reachinbox.ai>'),
  
  // Scheduling & Concurrency
  WORKER_CONCURRENCY: z.coerce.number().min(1).default(5),
  EMAIL_DELAY_MS: z.coerce.number().min(0).default(2000),
  MAX_EMAILS_PER_HOUR: z.coerce.number().min(1).default(200),
  
  // Auth Session
  SESSION_SECRET: z.string().min(16).default('reachinbox_default_secret_key_minimum_32_characters_for_jwt!'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const env = parsed.data;
export type EnvConfig = typeof env;
