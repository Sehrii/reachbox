import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getEmail, getStats, listEmails, scheduleCampaign, searchEmails } from '../services/emails.js';

export const emailsRouter = Router();
emailsRouter.use(requireAuth);

const MAX_RECIPIENTS = 10_000;

const scheduleSchema = z.object({
  subject: z.string().trim().min(1).max(500),
  body: z.string().min(1).max(100_000),
  recipients: z.array(z.email()).min(1).max(MAX_RECIPIENTS),
  startAt: z.coerce.date(),
  delayMs: z.coerce.number().int().min(0).max(24 * 3600_000),
  hourlyLimit: z.coerce.number().int().min(1).max(100_000),
  senderId: z.uuid().optional(),
});

emailsRouter.post('/schedule', async (req, res) => {
  const input = scheduleSchema.parse(req.body);
  const result = await scheduleCampaign(req.userId!, input);
  res.status(201).json(result);
});

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

emailsRouter.get('/scheduled', async (req, res) => {
  const { page, pageSize } = pageSchema.parse(req.query);
  res.json(await listEmails(req.userId!, 'scheduled', page, pageSize));
});

emailsRouter.get('/sent', async (req, res) => {
  const { page, pageSize } = pageSchema.parse(req.query);
  res.json(await listEmails(req.userId!, 'sent', page, pageSize));
});

emailsRouter.get('/stats', async (req, res) => {
  res.json(await getStats(req.userId!));
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(200),
  kind: z.enum(['scheduled', 'sent']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

emailsRouter.get('/search', async (req, res) => {
  const { q, kind, limit } = searchSchema.parse(req.query);
  res.json({ items: await searchEmails(req.userId!, q, kind, limit) });
});

emailsRouter.get('/:id', async (req, res) => {
  res.json(await getEmail(req.userId!, req.params.id));
});
