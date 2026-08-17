import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db';
import { hashPassword, createToken, setTokenCookie, normalizeEmail, getUserIdFromRequest } from '@/lib/auth';
import { registerSchema, formatZodError } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { isTrustedOrigin } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }

  const limit = rateLimit(request, 'register', 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте позже' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  // Уже авторизованный пользователь не должен создавать второй аккаунт из той же сессии.
  const existingUserId = await getUserIdFromRequest();
  if (existingUserId) {
    return NextResponse.json({ error: 'Вы уже авторизованы' }, { status: 409 });
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { password, name } = parsed.data;
    const email = normalizeEmail(parsed.data.email);

    // Запрещаем регистрацию на адрес администратора — иначе до бутстрапа
    // ensureAdminUser() злоумышленник мог бы занять этот email обычным аккаунтом.
    const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@ozoda.app').trim().toLowerCase();
    if (email === adminEmail) {
      return NextResponse.json({ error: 'Этот email зарезервирован' }, { status: 409 });
    }

    const existing = await get<{ id: number }>('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const result = await run(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, passwordHash, name || null]
    );

    const userId = result.lastInsertRowid;
    const token = createToken(userId);

    const response = NextResponse.json({ user: { id: userId, email, name } }, { status: 201 });
    setTokenCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 409 });
    }
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
