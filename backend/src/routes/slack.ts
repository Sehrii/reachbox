import { Router } from 'express';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { buildAuthorizeUrl, completeOAuth, disconnect, getConnection, postToUser } from '../services/slack.js';
import { logger } from '../lib/logger.js';

export const slackRouter = Router();

/** The frontend navigates the browser here when "Connect Slack" is clicked. */
slackRouter.get('/connect', requireAuth, (req, res) => {
  res.redirect(buildAuthorizeUrl(req.userId!));
});

/** Slack redirects back here. Not behind requireAuth: the signed `state` identifies the user. */
slackRouter.get('/callback', async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  if (error || !code || !state) {
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&reason=${encodeURIComponent(error ?? 'missing_code')}`);
    return;
  }
  try {
    await completeOAuth(code, state);
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (err) {
    logger.warn('Slack OAuth callback failed', { error: String(err) });
    const reason = err instanceof HttpError ? err.message : 'oauth_failed';
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&reason=${encodeURIComponent(reason)}`);
  }
});

slackRouter.get('/status', requireAuth, async (req, res) => {
  const conn = await getConnection(req.userId!);
  res.json({
    connected: Boolean(conn),
    teamName: conn?.teamName ?? null,
    channel: conn?.channel ?? null,
    connectedAt: conn?.connectedAt ?? null,
  });
});

slackRouter.post('/test', requireAuth, async (req, res) => {
  const ok = await postToUser(req.userId!, ':wave: ReachBox is connected. Rate-limit alerts will show up here.');
  if (!ok) throw new HttpError(400, 'Slack is not connected or the webhook rejected the message');
  res.json({ ok });
});

slackRouter.delete('/', requireAuth, async (req, res) => {
  await disconnect(req.userId!);
  res.status(204).end();
});
