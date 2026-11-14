import nodemailer, { type Transporter } from 'nodemailer';
import type { Sender } from '@prisma/client';

const transporters = new Map<string, Transporter>();

function transporterFor(sender: Sender): Transporter {
  let t = transporters.get(sender.id);
  if (!t) {
    t = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpPort === 465,
      auth: { user: sender.smtpUser, pass: sender.smtpPass },
      pool: true,
      maxConnections: 2,
      tls: {
        rejectUnauthorized: false,
      },
    });
    transporters.set(sender.id, t);
  }
  return t;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const looksLikeHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

/** The dashboard editor sends HTML; plain-text bodies (API clients) are converted. */
export const bodyToHtml = (body: string) =>
  looksLikeHtml(body) ? body : escapeHtml(body).replace(/\n/g, '<br>');

export const bodyToText = (body: string) =>
  looksLikeHtml(body)
    ? body
        .replace(/<(br|\/p|\/div|\/li|\/blockquote)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : body;

export interface SendResult {
  messageId: string;
  previewUrl: string | null;
}

export async function sendEmail(params: {
  sender: Sender;
  to: string;
  subject: string;
  body: string;
  /** Stable per email row; lets downstream systems de-dupe if a send is ever retried. */
  idempotencyKey: string;
}): Promise<SendResult> {
  const info = await transporterFor(params.sender).sendMail({
    from: `"${params.sender.name}" <${params.sender.email}>`,
    to: params.to,
    subject: params.subject,
    text: bodyToText(params.body),
    html: bodyToHtml(params.body),
    headers: { 'X-ReachBox-Email-Id': params.idempotencyKey },
  });
  const preview = nodemailer.getTestMessageUrl(info);
  return { messageId: info.messageId, previewUrl: preview || null };
}

export function closeTransporters(): void {
  for (const t of transporters.values()) t.close();
  transporters.clear();
}
