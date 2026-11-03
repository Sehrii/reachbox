import { EmailStatus, type Prisma } from '@prisma/client';
import { elastic, EMAIL_INDEX } from '../lib/elastic.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export interface EmailSearchDoc {
  id: string;
  userId: string;
  campaignId: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailStatus;
  senderEmail: string;
  scheduledAt: Date;
  sentAt: Date | null;
}

export async function ensureSearchIndex(): Promise<void> {
  if (!elastic) return;
  try {
    const exists = await elastic.indices.exists({ index: EMAIL_INDEX });
    if (exists) return;
    await elastic.indices.create({
      index: EMAIL_INDEX,
      mappings: {
        properties: {
          userId: { type: 'keyword' },
          campaignId: { type: 'keyword' },
          recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          subject: { type: 'text' },
          body: { type: 'text' },
          status: { type: 'keyword' },
          senderEmail: { type: 'keyword' },
          scheduledAt: { type: 'date' },
          sentAt: { type: 'date' },
        },
      },
    });
    logger.info('Created Elasticsearch index', { index: EMAIL_INDEX });
  } catch (err) {
    logger.warn('Elasticsearch unavailable; search will use Postgres', { error: String(err) });
  }
}

/** Indexing is best-effort: Postgres is the source of truth, ES only powers search. */
export async function indexEmails(docs: EmailSearchDoc[]): Promise<void> {
  if (!elastic || docs.length === 0) return;
  try {
    const operations = docs.flatMap((d) => [{ index: { _index: EMAIL_INDEX, _id: d.id } }, d]);
    const res = await elastic.bulk({ operations, refresh: false });
    if (res.errors) logger.warn('Some emails failed to index', { count: docs.length });
  } catch (err) {
    logger.warn('Elasticsearch bulk index failed', { error: String(err) });
  }
}

export async function updateEmailDoc(id: string, patch: Partial<EmailSearchDoc>): Promise<void> {
  if (!elastic) return;
  try {
    await elastic.update({ index: EMAIL_INDEX, id, doc: patch, retry_on_conflict: 3 });
  } catch (err) {
    logger.warn('Elasticsearch update failed', { id, error: String(err) });
  }
}

export interface SearchParams {
  userId: string;
  q: string;
  status?: EmailStatus[];
  limit: number;
}

/** Returns matching email ids in relevance order. */
export async function searchEmailIds(p: SearchParams): Promise<string[]> {
  if (elastic) {
    try {
      const res = await elastic.search<EmailSearchDoc>({
        index: EMAIL_INDEX,
        size: p.limit,
        _source: false,
        query: {
          bool: {
            filter: [
              { term: { userId: p.userId } },
              ...(p.status?.length ? [{ terms: { status: p.status } }] : []),
            ],
            must: {
              multi_match: {
                query: p.q,
                fields: ['recipient^3', 'subject^2', 'body'],
                type: 'bool_prefix',
              },
            },
          },
        },
      });
      return res.hits.hits.map((h) => h._id!).filter(Boolean);
    } catch (err) {
      logger.warn('Elasticsearch search failed; falling back to Postgres', { error: String(err) });
    }
  }

  const where: Prisma.EmailWhereInput = {
    userId: p.userId,
    ...(p.status?.length ? { status: { in: p.status } } : {}),
    OR: [
      { recipient: { contains: p.q, mode: 'insensitive' } },
      { subject: { contains: p.q, mode: 'insensitive' } },
      { body: { contains: p.q, mode: 'insensitive' } },
    ],
  };
  const rows = await prisma.email.findMany({
    where,
    select: { id: true },
    take: p.limit,
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map((r) => r.id);
}
