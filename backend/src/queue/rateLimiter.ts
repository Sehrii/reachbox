import { redis } from '../lib/redis.js';

export const HOUR_MS = 3_600_000;

export const hourWindow = (ts: number) => Math.floor(ts / HOUR_MS);
export const nextWindowStart = (ts: number) => (hourWindow(ts) + 1) * HOUR_MS;

/**
 * Atomically checks both hourly counters and increments them only if neither
 * is at its limit. Running as one Lua script means two workers on different
 * machines can never both take the last slot.
 *   returns 0 = allowed, 1 = sender limit hit, 2 = campaign limit hit
 */
const ACQUIRE_HOURLY_SLOT = `
local senderCount = tonumber(redis.call('GET', KEYS[1]) or '0')
local campaignCount = tonumber(redis.call('GET', KEYS[2]) or '0')
if senderCount >= tonumber(ARGV[1]) then return 1 end
if campaignCount >= tonumber(ARGV[2]) then return 2 end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[3])
redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], ARGV[3])
return 0
`;

export type HourlyResult =
  | { ok: true }
  | { ok: false; scope: 'sender' | 'campaign'; limit: number; retryAt: number };

export async function acquireHourlySlot(params: {
  senderId: string;
  campaignId: string;
  senderLimit: number;
  campaignLimit: number;
  now?: number;
}): Promise<HourlyResult> {
  const now = params.now ?? Date.now();
  const w = hourWindow(now);
  const code = (await redis.eval(
    ACQUIRE_HOURLY_SLOT,
    2,
    `rl:sender:${params.senderId}:${w}`,
    `rl:campaign:${params.campaignId}:${w}`,
    params.senderLimit,
    params.campaignLimit,
    2 * 3600,
  )) as number;

  if (code === 0) return { ok: true };
  const scope = code === 1 ? 'sender' : 'campaign';
  return {
    ok: false,
    scope,
    limit: scope === 'sender' ? params.senderLimit : params.campaignLimit,
    retryAt: nextWindowStart(now),
  };
}

/**
 * Per-sender throttle: reserves the next free send time for a sender, at least
 * `gapMs` after the previous reservation. Returns the timestamp the caller may send at.
 * Only real send attempts reserve a slot, so jobs deferred by the hourly limit cost nothing.
 */
const RESERVE_SEND_TIME = `
local now = tonumber(ARGV[1])
local gap = tonumber(ARGV[2])
local nextFree = tonumber(redis.call('GET', KEYS[1]) or '0')
local at = math.max(now, nextFree)
redis.call('SET', KEYS[1], at + gap, 'PX', gap + 60000)
return at
`;

export async function reserveSendTime(senderId: string, gapMs: number): Promise<number> {
  if (gapMs <= 0) return Date.now();
  return (await redis.eval(RESERVE_SEND_TIME, 1, `throttle:sender:${senderId}`, Date.now(), gapMs)) as number;
}

/** Returns true only for the first caller per key+window, so Slack gets one alert per window. */
export async function claimNotification(key: string, ttlSeconds = 2 * 3600): Promise<boolean> {
  return (await redis.set(`notified:${key}`, '1', 'EX', ttlSeconds, 'NX')) === 'OK';
}
