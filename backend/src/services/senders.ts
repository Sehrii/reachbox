import nodemailer from 'nodemailer';
import type { Sender } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const ETHEREAL_HOST = 'smtp.ethereal.email';
const ETHEREAL_PORT = 587;

/** Seeds Ethereal sender accounts on first boot; existing rows are left alone. */
export async function ensureSenders(): Promise<void> {
  if ((await prisma.sender.count()) > 0) return;

  const provided = env.ETHEREAL_SENDERS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf(':');
      return { user: pair.slice(0, idx), pass: pair.slice(idx + 1) };
    });

  const accounts = provided.length
    ? provided
    : await Promise.all(
        Array.from({ length: env.SENDER_COUNT }, () => nodemailer.createTestAccount()),
      );

  await prisma.sender.createMany({
    data: accounts.map((a, i) => ({
      email: a.user,
      name: `ReachBox Sender ${i + 1}`,
      smtpHost: ETHEREAL_HOST,
      smtpPort: ETHEREAL_PORT,
      smtpUser: a.user,
      smtpPass: a.pass,
    })),
    skipDuplicates: true,
  });
  logger.info('Seeded Ethereal senders', { count: accounts.length });
}

export async function listSenders(): Promise<Sender[]> {
  return prisma.sender.findMany({ orderBy: { createdAt: 'asc' } });
}
