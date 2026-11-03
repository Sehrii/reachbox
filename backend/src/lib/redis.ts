import { Redis } from 'ioredis';
import { env } from '../config/env.js';

/**
 * BullMQ needs `maxRetriesPerRequest: null` on its connections so blocking
 * commands are never aborted. Each Queue/Worker gets its own connection.
 */
export function createRedisConnection(): Redis {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

/** Shared client for app-level keys (rate-limit counters, notification de-dupe). */
export const redis = createRedisConnection();
