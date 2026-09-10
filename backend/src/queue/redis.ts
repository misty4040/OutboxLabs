import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Shared Redis connection options for BullMQ
 * BullMQ requires maxRetriesPerRequest to be null
 */
export const redisOptions: import('ioredis').RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
};

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, redisOptions);

    redisClient.on('connect', () => {
      console.log('✅ Connected to Redis successfully');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });
  }
  return redisClient;
};
