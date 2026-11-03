import { logger } from './lib/logger.js';

type Closer = () => Promise<unknown> | unknown;

/**
 * On SIGINT/SIGTERM close things in order. `worker.close()` waits for in-flight
 * jobs to finish, which keeps rows from being left in SENDING.
 */
export function onShutdown(closers: Closer[]): void {
  let shuttingDown = false;
  const handler = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('Shutting down', { signal });
    for (const close of closers) {
      try {
        await close();
      } catch (err) {
        logger.error('Error during shutdown', { error: String(err) });
      }
    }
    process.exit(0);
  };
  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
}
