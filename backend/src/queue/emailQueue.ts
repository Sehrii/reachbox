import { Queue } from 'bullmq';
import { createRedisConnection } from '../lib/redis.js';

export const EMAIL_QUEUE = 'email-send';

/** Jobs carry only the id; the DB row is the source of truth for content and status. */
export interface EmailJobData {
  emailId: string;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: { age: 24 * 3600, count: 5000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

export interface EnqueueItem {
  id: string;
  scheduledAt: Date;
}

/**
 * jobId === emailId, so adding the same email twice is a no-op while the job
 * still exists in Redis. That makes enqueueing (and re-enqueueing on boot) idempotent.
 */
export async function enqueueEmails(items: EnqueueItem[], chunkSize = 500): Promise<void> {
  const now = Date.now();
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await emailQueue.addBulk(
      chunk.map((e) => ({
        name: 'send',
        data: { emailId: e.id },
        opts: { jobId: e.id, delay: Math.max(0, e.scheduledAt.getTime() - now) },
      })),
    );
  }
}
