import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { env } from './config/env.js';
import { emailQueue } from './queue/emailQueue.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { emailsRouter } from './routes/emails.js';
import { slackRouter } from './routes/slack.js';
import { listSenders } from './services/senders.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Live queue dashboard
  const boardAdapter = new ExpressAdapter().setBasePath('/admin/queues');
  createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter: boardAdapter });
  app.use('/admin/queues', boardAdapter.getRouter());

  app.use('/auth', authRouter);
  app.use('/api/emails', emailsRouter);
  app.use('/api/slack', slackRouter);
  app.get('/api/senders', requireAuth, async (_req, res) => {
    const senders = await listSenders();
    res.json({ items: senders.map(({ id, email, name }) => ({ id, email, name })) });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
