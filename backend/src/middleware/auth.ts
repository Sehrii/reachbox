import type { RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env, isProd } from '../config/env.js';
import { HttpError } from './error.js';

export const AUTH_COOKIE = 'rb_session';
const SESSION_TTL_S = 7 * 24 * 3600;

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function setSessionCookie(res: Response, userId: string): void {
  const token = jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: SESSION_TTL_S });
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SESSION_TTL_S * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
}

/** Accepts the session cookie (browser) or `Authorization: Bearer <jwt>` (API clients). */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = req.cookies?.[AUTH_COOKIE] ?? (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
  if (!token) throw new HttpError(401, 'Not authenticated');
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    throw new HttpError(401, 'Session expired');
  }
};
