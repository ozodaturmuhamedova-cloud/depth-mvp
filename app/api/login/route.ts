import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/db';
import {
  comparePassword,
  createToken,
  setTokenCookie,
  normalizeEmail,
  getUserIdFromRequest,
  DUMMY_PASSWORD_HASH,
} from '@/lib/auth';
import { loginSchema, formatZodError } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { isTrustedOrigin } from '@/lib/csrf';

const GENERIC_ERROR = 'Неверный email или пароль';

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }

  const limit = rateLimit(request, 'login', 10, 15 * 60 * 1000);
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
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const email = normalizeEmail(parsed.data.email);
    const { password } = parsed.data;

    const user = await get<{ id: number; email: string; password_hash: string }>(
      'SELECT id, email, password_hash FROM users WHERE email = ?',
      [email]
    );

    // Холостой bcrypt.compare по фиктивному хешу, когда пользователь не найден:
    // без этого время ответа выдаёт существование email (тайминг-атака/
    // перечисление аккаунтов), т.к. bcrypt.compare — единственная дорогая операция здесь.
    const passwordHash = user?.password_hash ?? DUMMY_PASSWORD_HASH;
    const valid = await comparePassword(password, passwordHash);

    if (!user || !valid) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const token = createToken(user.id);

    const response = NextResponse.json({ user: { id: user.id, email: user.email } });
    setTokenCookie(response, token);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
