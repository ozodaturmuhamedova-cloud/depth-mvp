import 'server-only';
import { createHmac, createHash, timingSafeEqual } from 'crypto';
import type { TelegramAuthData } from '@/lib/validation';

const AUTH_MAX_AGE_SECONDS = 24 * 60 * 60;

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN must be set in environment variables');
  }
  return token;
}

export function getTelegramAdminId(): number | null {
  const raw = process.env.TELEGRAM_ADMIN_ID?.trim();
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Проверка подписи Telegram Login Widget.
 * @see https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuth(data: TelegramAuthData): boolean {
  const { hash, ...fields } = data;

  const dataCheckString = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHash('sha256').update(getBotToken()).digest();
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  try {
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function isTelegramAuthFresh(authDate: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - authDate <= AUTH_MAX_AGE_SECONDS;
}

export function buildTelegramDisplayName(data: TelegramAuthData): string {
  const parts = [data.first_name, data.last_name].filter(Boolean);
  return parts.join(' ').trim() || data.username || `User ${data.id}`;
}
