import { randomUUID } from 'node:crypto';
import { EmailStatus, type Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { enqueueEmails } from '../queue/emailQueue.js';
import { HttpError } from '../middleware/error.js';
import { indexEmails, searchEmailIds } from './search.js';

export interface ScheduleInput {
  subject: string;
  body: string;
  recipients: string[];
  startAt: Date;
  delayMs: number;
  hourlyLimit: number;
  /** Pin the campaign to one sender; omitted = rotate across all senders. */
  senderId?: string;
}

export async function scheduleCampaign(userId: string, input: ScheduleInput) {
  const recipients = [...new Set(input.recipients.map((r) => r.trim().toLowerCase()))];
  const senders = await prisma.sender.findMany({
    where: input.senderId ? { id: input.senderId } : undefined,
    orderBy: { createdAt: 'asc' },
  });
  if (senders.length === 0) {
    throw new HttpError(input.senderId ? 400 : 503, input.senderId ? 'Unknown sender' : 'No sender accounts are configured');
  }

  const startAt = new Date(Math.max(input.startAt.getTime(), Date.now()));
  const campaignId = randomUUID();

  // Email i goes out at startAt + i * delay, rotating across senders.
  const rows = recipients.map((recipient, i) => {
    const sender = senders[i % senders.length];
    return {
      id: randomUUID(),
      campaignId,
      userId,
      senderId: sender.id,
      senderEmail: sender.email,
      seq: i,
      recipient,
      subject: input.subject,
      body: input.body,
      scheduledAt: new Date(startAt.getTime() + i * input.delayMs),
    };
  });

  // Persist first. If we crash before enqueueing, boot-time reconciliation enqueues
  // every SCHEDULED row, so nothing is lost.
  await prisma.$transaction(async (tx) => {
    await tx.campaign.create({
      data: {
        id: campaignId,
        userId,
        subject: input.subject,
        body: input.body,
        startAt,
        delayMs: input.delayMs,
        hourlyLimit: input.hourlyLimit,
      },
    });
    for (let i = 0; i < rows.length; i += 1000) {
      await tx.email.createMany({
        data: rows.slice(i, i + 1000).map(({ senderEmail: _s, ...r }) => r),
      });
    }
  });

  await enqueueEmails(rows);
  void indexEmails(
    rows.map((r) => ({
      id: r.id,
      userId,
      campaignId,
      recipient: r.recipient,
      subject: r.subject,
      body: r.body,
      status: EmailStatus.SCHEDULED,
      senderEmail: r.senderEmail,
      scheduledAt: r.scheduledAt,
      sentAt: null,
    })),
  );

  return {
    campaignId,
    count: rows.length,
    firstScheduledAt: rows[0]?.scheduledAt ?? startAt,
    lastScheduledAt: rows.at(-1)?.scheduledAt ?? startAt,
  };
}

const emailInclude = { sender: { select: { email: true } } } satisfies Prisma.EmailInclude;
type EmailWithSender = Prisma.EmailGetPayload<{ include: typeof emailInclude }>;

export interface EmailDto {
  id: string;
  campaignId: string;
  recipient: string;
  subject: string;
  body: string;
  senderEmail: string;
  status: 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledAt: string;
  sentAt: string | null;
  failedReason: string | null;
  previewUrl: string | null;
  rescheduleCount: number;
  updatedAt: string;
}

export const toDto = (e: EmailWithSender): EmailDto => ({
  id: e.id,
  campaignId: e.campaignId,
  recipient: e.recipient,
  subject: e.subject,
  body: e.body,
  senderEmail: e.sender.email,
  status: e.status.toLowerCase() as EmailDto['status'],
  scheduledAt: e.scheduledAt.toISOString(),
  sentAt: e.sentAt?.toISOString() ?? null,
  failedReason: e.failedReason,
  previewUrl: e.previewUrl,
  rescheduleCount: e.rescheduleCount,
  updatedAt: e.updatedAt.toISOString(),
});

export type EmailListKind = 'scheduled' | 'sent';

const listConfig: Record<
  EmailListKind,
  { status: EmailStatus[]; orderBy: Prisma.EmailOrderByWithRelationInput[] }
> = {
  scheduled: {
    status: [EmailStatus.SCHEDULED, EmailStatus.SENDING],
    orderBy: [{ scheduledAt: 'asc' }, { seq: 'asc' }],
  },
  sent: {
    status: [EmailStatus.SENT, EmailStatus.FAILED],
    orderBy: [{ updatedAt: 'desc' }],
  },
};

export async function listEmails(
  userId: string,
  kind: EmailListKind,
  page: number,
  pageSize: number,
) {
  const cfg = listConfig[kind];
  const where: Prisma.EmailWhereInput = { userId, status: { in: cfg.status } };
  const [items, total] = await prisma.$transaction([
    prisma.email.findMany({
      where,
      include: emailInclude,
      orderBy: cfg.orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.email.count({ where }),
  ]);
  return { items: items.map(toDto), total, page, pageSize };
}

export async function searchEmails(userId: string, q: string, kind?: EmailListKind, limit = 50) {
  const ids = await searchEmailIds({ userId, q, status: kind ? listConfig[kind].status : undefined, limit });
  if (ids.length === 0) return [];
  const rows = await prisma.email.findMany({ where: { id: { in: ids }, userId }, include: emailInclude });
  const byId = new Map(rows.map((r) => [r.id, r]));
  // Keep relevance order from the search engine.
  return ids.flatMap((id) => (byId.has(id) ? [toDto(byId.get(id)!)] : []));
}

export async function getEmail(userId: string, id: string) {
  const email = await prisma.email.findFirst({ where: { id, userId }, include: emailInclude });
  if (!email) throw new HttpError(404, 'Email not found');
  return toDto(email);
}

export async function getStats(userId: string) {
  const groups = await prisma.email.groupBy({ by: ['status'], where: { userId }, _count: true });
  const counts = Object.fromEntries(groups.map((g) => [g.status.toLowerCase(), g._count]));
  return {
    scheduled: (counts.scheduled ?? 0) + (counts.sending ?? 0),
    sent: counts.sent ?? 0,
    failed: counts.failed ?? 0,
  };
}
