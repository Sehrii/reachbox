import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env, isProd } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { clearSessionCookie, requireAuth, setSessionCookie } from '../middleware/auth.js';

export const authRouter = Router();

const STATE_COOKIE = 'rb_oauth_state';
const googleRedirectUri = () => `${env.API_URL}/auth/google/callback`;

authRouter.get('/google', (_req, res) => {
  if (!env.GOOGLE_CLIENT_ID) throw new HttpError(503, 'Google OAuth is not configured');
  const state = randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 10 * 60_000 });

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', googleRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  res.redirect(url.toString());
});

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}
interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

authRouter.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  const expected = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE);
  if (error || !code || !state || state !== expected) {
    res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(error ?? 'invalid_state')}`);
    return;
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  const tokens = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokens.access_token) {
    res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(tokens.error ?? 'token_exchange_failed')}`);
    return;
  }

  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const info = (await infoRes.json()) as GoogleUserInfo;

  const profile = { email: info.email, name: info.name ?? info.email, avatarUrl: info.picture ?? null };
  const user = await prisma.user.upsert({
    where: { googleId: info.sub },
    create: { googleId: info.sub, ...profile },
    update: profile,
  });

  setSessionCookie(res, user.id);
  res.redirect(`${env.FRONTEND_URL}/dashboard`);
});

/** Local testing without Google credentials. Disabled unless ENABLE_DEV_LOGIN=true and not in production. */
authRouter.post('/dev-login', async (req, res) => {
  if (!env.ENABLE_DEV_LOGIN || isProd) throw new HttpError(404, 'Not found');
  const body = z.object({ email: z.email(), name: z.string().min(1).optional() }).parse(req.body);
  const user = await prisma.user.upsert({
    where: { email: body.email },
    create: { googleId: `dev:${body.email}`, email: body.email, name: body.name ?? body.email },
    update: {},
  });
  setSessionCookie(res, user.id);
  res.json({ user });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { slack: { select: { teamName: true, channel: true, connectedAt: true } } },
  });
  if (!user) throw new HttpError(401, 'User no longer exists');
  res.json({
    user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
    slack: user.slack,
  });
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});
