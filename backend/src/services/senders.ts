import nodemailer from 'nodemailer';
import type { Sender } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const ETHEREAL_HOST = 'smtp.ethereal.email';
const ETHEREAL_PORT = 587;

/** Seeds sender accounts on first boot; existing rows are left alone. */
export async function ensureSenders(): Promise<void> {
  if ((await prisma.sender.count()) > 0) return;

  const useCustomSmtp = env.SMTP_HOST.length > 0;
  const smtpHost = useCustomSmtp ? env.SMTP_HOST : ETHEREAL_HOST;
  const smtpPort = useCustomSmtp ? env.SMTP_PORT : ETHEREAL_PORT;

  const provided = env.ETHEREAL_SENDERS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf(':');
      return { user: pair.slice(0, idx), pass: pair.slice(idx + 1) };
    });

  const accounts = (provided.length && useCustomSmtp)
    ? provided
    : await Promise.all(
        Array.from({ length: env.SENDER_COUNT }, () => nodemailer.createTestAccount()),
      );

  await prisma.sender.createMany({
    data: accounts.map((a, i) => ({
      email: a.user,
      name: `ReachBox Sender ${i + 1}`,
      smtpHost,
      smtpPort,
      smtpUser: a.user,
      smtpPass: a.pass,
    })),
    skipDuplicates: true,
  });

  if (useCustomSmtp) {
    logger.info('Seeded custom SMTP senders', { count: accounts.length, host: smtpHost, port: smtpPort });
  } else {
    logger.info('Seeded Ethereal senders', { count: accounts.length });
  }
}

export async function listSenders(): Promise<Sender[]> {
  return prisma.sender.findMany({ orderBy: { createdAt: 'asc' } });
}
