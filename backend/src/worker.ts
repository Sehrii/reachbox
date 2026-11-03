/** Standalone worker process. Run as many of these as you like; Redis coordinates them. */
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';
import { closeTransporters } from './services/mailer.js';
import { startEmailWorker } from './workers/emailWorker.js';
import { onShutdown } from './shutdown.js';

const worker = startEmailWorker();
logger.info('Standalone worker running', { pid: process.pid });

onShutdown([
  () => worker.close(),
  () => closeTransporters(),
  () => redis.quit(),
  () => prisma.$disconnect(),
]);
