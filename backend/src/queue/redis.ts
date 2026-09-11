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
    try {
      redisClient = new Redis(env.REDIS_URL, redisOptions);
    } catch (err: any) {
      console.error(`⚠️ [Redis] Error creating Redis client with ${env.REDIS_URL}: ${err.message}. Falling back to default.`);
      redisClient = new Redis('redis://127.0.0.1:6379', redisOptions);
    }

    redisClient.on('connect', () => {
      console.log('✅ Connected to Redis successfully');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });
  }
  return redisClient;
};
