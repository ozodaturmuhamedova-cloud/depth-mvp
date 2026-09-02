import { NextRequest, NextResponse } from 'next/server';
import { createToken, setTokenCookie, getUserIdFromRequest } from '@/lib/auth';
import { telegramAuthSchema, formatZodError } from '@/lib/validation';
import { verifyTelegramAuth, isTelegramAuthFresh, buildTelegramDisplayName } from '@/lib/telegram-auth';
import { findOrLinkTelegramUser } from '@/lib/telegram-user';
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

    const { user } = await findOrLinkTelegramUser(data);
    const displayName = buildTelegramDisplayName(data);
    const telegramUsername = data.username ?? null;

    const token = createToken(user.id);
    const response = NextResponse.json({
      user: { id: user.id, name: displayName, telegram_username: telegramUsername },
    });
    setTokenCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'TELEGRAM_USERNAME_CONFLICT') {
      return NextResponse.json(
        { error: 'Этот Telegram-аккаунт уже привязан к другому пользователю' },
        { status: 409 }
      );
    }
    console.error('Telegram auth error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
