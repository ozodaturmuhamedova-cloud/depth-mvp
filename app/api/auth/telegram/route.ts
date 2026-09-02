import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db';
import { createToken, setTokenCookie, getUserIdFromRequest } from '@/lib/auth';
import { telegramAuthSchema, formatZodError } from '@/lib/validation';
import {
  verifyTelegramAuth,
  isTelegramAuthFresh,
  buildTelegramDisplayName,
  getTelegramAdminId,
} from '@/lib/telegram-auth';
import { rateLimit } from '@/lib/rate-limit';
import { isTrustedOrigin } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }

  const limit = rateLimit(request, 'telegram-auth', 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте позже' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const existingUserId = await getUserIdFromRequest();
  if (existingUserId) {
    return NextResponse.json({ error: 'Вы уже авторизованы' }, { status: 409 });
  }

  try {
    const body = await request.json();
    const parsed = telegramAuthSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const data = parsed.data;

    if (!isTelegramAuthFresh(data.auth_date)) {
      return NextResponse.json({ error: 'Данные авторизации устарели. Попробуйте снова' }, { status: 401 });
    }

    if (!verifyTelegramAuth(data)) {
      return NextResponse.json({ error: 'Недействительные данные Telegram' }, { status: 401 });
    }

    const displayName = buildTelegramDisplayName(data);
    const telegramUsername = data.username ?? null;
    const adminTelegramId = getTelegramAdminId();
    const shouldBeAdmin = adminTelegramId !== null && data.id === adminTelegramId;

    let user = await get<{ id: number; role: string }>(
      'SELECT id, role FROM users WHERE telegram_id = ?',
      [data.id]
    );

    if (user) {
      await run(
        `UPDATE users SET name = ?, telegram_username = ?, last_login_at = datetime('now') WHERE id = ?`,
        [displayName, telegramUsername, user.id]
      );

      if (shouldBeAdmin && user.role !== 'admin') {
        await run(`UPDATE users SET role = 'user' WHERE role = 'admin'`);
        await run('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
        user = { ...user, role: 'admin' };
      }
    } else {
      const role = shouldBeAdmin ? 'admin' : 'user';

      if (shouldBeAdmin) {
        await run(`UPDATE users SET role = 'user' WHERE role = 'admin'`);
      }

      const result = await run(
        `INSERT INTO users (telegram_id, telegram_username, name, role, last_login_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [data.id, telegramUsername, displayName, role]
      );
      user = { id: result.lastInsertRowid, role };
    }

    const token = createToken(user.id);
    const response = NextResponse.json({
      user: { id: user.id, name: displayName, telegram_username: telegramUsername },
    });
    setTokenCookie(response, token);
    return response;
  } catch (error) {
    console.error('Telegram auth error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
