import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { HttpError } from '../middleware/error.js';

// Slack only accepts https redirects, so locally this points at a tunnel while the rest of the API stays on localhost.
const redirectUri = () => env.SLACK_REDIRECT_URI || `${env.API_URL}/api/slack/callback`;

export const slackConfigured = () => Boolean(env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET);

/** The OAuth `state` is a short-lived signed token binding the callback to the user who started it. */
export function buildAuthorizeUrl(userId: string): string {
  if (!slackConfigured()) throw new HttpError(503, 'Slack integration is not configured');
  const state = jwt.sign({ uid: userId, purpose: 'slack' }, env.JWT_SECRET, { expiresIn: '10m' });
  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.searchParams.set('client_id', env.SLACK_CLIENT_ID);
  url.searchParams.set('scope', 'incoming-webhook');
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('state', state);
  return url.toString();
}

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  team?: { id: string; name: string };
  incoming_webhook?: { channel: string; url: string };
}

export async function completeOAuth(code: string, state: string): Promise<string> {
  let userId: string;
  try {
    const payload = jwt.verify(state, env.JWT_SECRET) as { uid: string; purpose: string };
    if (payload.purpose !== 'slack') throw new Error('wrong purpose');
    userId = payload.uid;
  } catch {
    throw new HttpError(400, 'Invalid or expired Slack OAuth state');
  }

  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri(),
    }),
  });
  const data = (await res.json()) as SlackOAuthResponse;
  if (!data.ok || !data.incoming_webhook || !data.team) {
    throw new HttpError(400, `Slack OAuth failed: ${data.error ?? 'missing webhook'}`);
  }

  const fields = {
    teamId: data.team.id,
    teamName: data.team.name,
    channel: data.incoming_webhook.channel,
    webhookUrl: data.incoming_webhook.url,
    connectedAt: new Date(),
  };
  await prisma.slackConnection.upsert({
    where: { userId },
    create: { userId, ...fields },
    update: fields,
  });
  return userId;
}

export async function getConnection(userId: string) {
  return prisma.slackConnection.findUnique({ where: { userId } });
}

export async function disconnect(userId: string): Promise<void> {
  await prisma.slackConnection.deleteMany({ where: { userId } });
}

/**
 * Looks the webhook up on every call, so connecting or disconnecting takes effect
 * immediately. Never throws: a Slack problem must not fail an email job.
 */
export async function postToUser(userId: string, text: string, blocks?: unknown[]): Promise<boolean> {
  const conn = await getConnection(userId);
  if (!conn) return false;
  try {
    const res = await fetch(conn.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, blocks }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.warn('Slack webhook rejected message', { userId, status: res.status, body });
      // Slack returns 404/410 once the app is uninstalled or the channel is gone.
      if (res.status === 404 || res.status === 410) await disconnect(userId);
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('Slack webhook call failed', { userId, error: String(err) });
    return false;
  }
}

export async function notifyRateLimitHit(params: {
  userId: string;
  scope: 'sender' | 'campaign';
  senderEmail: string;
  campaignSubject: string;
  limit: number;
  resumeAt: Date;
}): Promise<void> {
  const who = params.scope === 'sender' ? `Sender *${params.senderEmail}*` : `Campaign *${params.campaignSubject}*`;
  const text = `:warning: ${who} hit its hourly limit of ${params.limit} emails. Remaining emails are deferred to ${params.resumeAt.toISOString()}.`;
  const sent = await postToUser(params.userId, text, [
    { type: 'section', text: { type: 'mrkdwn', text } },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Campaign: ${params.campaignSubject} · Sender: ${params.senderEmail}` }],
    },
  ]);
  if (sent) logger.info('Slack rate-limit notification sent', { userId: params.userId, scope: params.scope });
}
