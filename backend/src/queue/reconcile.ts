import { EmailStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { enqueueEmails } from './emailQueue.js';

const STALE_SENDING_MS = 5 * 60_000;

/**
 * Runs on boot. Redis (with AOF) already keeps delayed jobs across restarts; this
 * covers the gaps:
 *  - rows committed to Postgres whose jobs never reached Redis (crash between the two),
 *  - a Redis that lost data (no persistence, flushed, new instance).
 * Re-adding is safe because jobId === emailId: existing jobs are left untouched.
 *
 * Rows stuck in SENDING mean a process died mid-SMTP call. We can't know whether the
 * message went out, so we mark them FAILED rather than risk a duplicate (at-most-once).
 */
export async function reconcileQueue(): Promise<void> {
  const stale = await prisma.email.updateMany({
    where: { status: EmailStatus.SENDING, updatedAt: { lt: new Date(Date.now() - STALE_SENDING_MS) } },
    data: {
      status: EmailStatus.FAILED,
      failedReason: 'Interrupted during send; not retried to avoid a duplicate delivery',
    },
  });

  let cursor: string | undefined;
  let requeued = 0;
  for (;;) {
    const batch = await prisma.email.findMany({
      where: { status: EmailStatus.SCHEDULED },
      select: { id: true, scheduledAt: true },
      orderBy: { id: 'asc' },
      take: 1000,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;
    await enqueueEmails(batch);
    requeued += batch.length;
    cursor = batch.at(-1)!.id;
  }

  logger.info('Queue reconciled', { scheduledChecked: requeued, staleSendingFailed: stale.count });
}
