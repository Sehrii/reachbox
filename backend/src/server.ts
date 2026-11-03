import type { Server } from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';
import { emailQueue } from './queue/emailQueue.js';
import { reconcileQueue } from './queue/reconcile.js';
import { ensureSearchIndex } from './services/search.js';
import { ensureSenders } from './services/senders.js';
import { closeTransporters } from './services/mailer.js';
import { startEmailWorker } from './workers/emailWorker.js';
import { onShutdown } from './shutdown.js';

async function main() {
  await ensureSenders();
  await ensureSearchIndex();
  await reconcileQueue();

  const worker = env.RUN_WORKER_IN_API ? startEmailWorker() : null;
  const server: Server = createApp().listen(env.PORT, () => {
    logger.info('API listening', { port: env.PORT, queueDashboard: `${env.API_URL}/admin/queues` });
  });

  onShutdown([
    () => new Promise((r) => server.close(r)),
    () => worker?.close(),
    () => emailQueue.close(),
    () => closeTransporters(),
    () => redis.quit(),
    () => prisma.$disconnect(),
  ]);
}

main().catch((err) => {
  logger.error('Failed to start API', { error: err instanceof Error ? err.stack : String(err) });
  process.exit(1);
});
