import { DelayedError, Worker, type Job } from 'bullmq';
import { EmailStatus } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { createRedisConnection } from '../lib/redis.js';
import { EMAIL_QUEUE, type EmailJobData } from '../queue/emailQueue.js';
import { acquireHourlySlot, claimNotification, hourWindow, reserveSendTime } from '../queue/rateLimiter.js';
import { sendEmail } from '../services/mailer.js';
import { notifyRateLimitHit } from '../services/slack.js';
import { updateEmailDoc } from '../services/search.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Put the job back into the delayed set without counting it as a failed attempt. */
async function deferJob(job: Job<EmailJobData>, token: string | undefined, at: number): Promise<never> {
  await job.moveToDelayed(at, token);
  throw new DelayedError();
}

async function processEmail(job: Job<EmailJobData>, token?: string) {
  const email = await prisma.email.findUnique({
    where: { id: job.data.emailId },
    include: { sender: true, campaign: true },
  });

  // Idempotency: only SCHEDULED rows are ever sent. SENT/FAILED are terminal, and SENDING
  // means another worker owns it (or a crash happened mid-send, which reconciliation handles).
  if (!email) return { skipped: 'missing' };
  if (email.status !== EmailStatus.SCHEDULED) return { skipped: email.status };

  const now = Date.now();
  if (email.scheduledAt.getTime() > now + 1000) {
    return deferJob(job, token, email.scheduledAt.getTime());
  }

  // 1. Hourly limits (per sender ceiling from env, per campaign from the compose form).
  const slot = await acquireHourlySlot({
    senderId: email.senderId,
    campaignId: email.campaignId,
    senderLimit: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
    campaignLimit: email.campaign.hourlyLimit,
    now,
  });

  if (!slot.ok) {
    // Push into the next window. Offsetting by seq keeps campaign order when they all wake up together.
    const retryAt = slot.retryAt + email.seq;
    await prisma.email.update({
      where: { id: email.id },
      data: { scheduledAt: new Date(retryAt), rescheduleCount: { increment: 1 } },
    });
    void updateEmailDoc(email.id, { scheduledAt: new Date(retryAt) });

    const scopeKey = slot.scope === 'sender' ? `sender:${email.senderId}` : `campaign:${email.campaignId}`;
    if (await claimNotification(`${email.userId}:${scopeKey}:${hourWindow(now)}`)) {
      void notifyRateLimitHit({
        userId: email.userId,
        scope: slot.scope,
        senderEmail: email.sender.email,
        campaignSubject: email.campaign.subject,
        limit: slot.limit,
        resumeAt: new Date(slot.retryAt),
      });
    }
    logger.info('Hourly limit reached; deferred', { emailId: email.id, scope: slot.scope, retryAt });
    return deferJob(job, token, retryAt);
  }

  // 2. Per-sender minimum gap between sends (shared across all workers through Redis).
  const sendAt = await reserveSendTime(email.senderId, env.MIN_DELAY_BETWEEN_SENDS_MS);
  if (sendAt > Date.now()) await sleep(sendAt - Date.now());

  // 3. Claim the row. The conditional update is atomic, so two workers can't both send it.
  const claimed = await prisma.email.updateMany({
    where: { id: email.id, status: EmailStatus.SCHEDULED },
    data: { status: EmailStatus.SENDING },
  });
  if (claimed.count === 0) return { skipped: 'claimed-elsewhere' };

  try {
    const result = await sendEmail({
      sender: email.sender,
      to: email.recipient,
      subject: email.subject,
      body: email.body,
      idempotencyKey: email.id,
    });
    const sentAt = new Date();
    await prisma.email.update({
      where: { id: email.id },
      data: { status: EmailStatus.SENT, sentAt, messageId: result.messageId, previewUrl: result.previewUrl },
    });
    void updateEmailDoc(email.id, { status: EmailStatus.SENT, sentAt });
    logger.info('Email sent', { emailId: email.id, to: email.recipient, previewUrl: result.previewUrl });
    return result;
  } catch (err) {
    const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    const reason = err instanceof Error ? err.message : String(err);
    await prisma.email.update({
      where: { id: email.id },
      data: finalAttempt
        ? { status: EmailStatus.FAILED, failedReason: reason }
        : { status: EmailStatus.SCHEDULED, failedReason: reason },
    });
    if (finalAttempt) void updateEmailDoc(email.id, { status: EmailStatus.FAILED });
    logger.warn('Email send failed', { emailId: email.id, attempt: job.attemptsMade + 1, finalAttempt, reason });
    throw err;
  }
}

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(EMAIL_QUEUE, processEmail, {
    connection: createRedisConnection(),
    concurrency: env.WORKER_CONCURRENCY,
  });
  worker.on('failed', (job, err) => logger.warn('Job failed', { jobId: job?.id, error: err.message }));
  worker.on('error', (err) => logger.error('Worker error', { error: err.message }));
  logger.info('Email worker started', {
    concurrency: env.WORKER_CONCURRENCY,
    minDelayMs: env.MIN_DELAY_BETWEEN_SENDS_MS,
    maxPerHourPerSender: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
  });
  return worker;
}
