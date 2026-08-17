import 'server-only';
import { NextRequest } from 'next/server';

// Простой in-memory rate limit по IP + названию маршрута (скользящее окно).
// Для MVP этого достаточно — храним состояние в памяти процесса Node.js.
// ВАЖНО: при развёртывании с несколькими инстансами (serverless/кластер)
// счётчики не разделяются между процессами — для прод-нагрузки нужен
// внешний стор (Redis/Upstash).

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Периодически подчищаем устаревшие записи, чтобы Map не росла бесконечно.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupIfNeeded(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/**
 * Ограничивает число запросов от одного IP на конкретный маршрут в заданное окно.
 */
export function rateLimit(
  request: NextRequest,
  routeKey: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  cleanupIfNeeded(now);

  const key = `${routeKey}:${getClientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}
