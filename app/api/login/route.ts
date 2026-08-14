import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/db';
import { comparePassword, createToken, setTokenCookie, normalizeEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email || '');
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 });
    }

    // Ищем пользователя
    const user = await get<{ id: number; email: string; password_hash: string }>(
      'SELECT id, email, password_hash FROM users WHERE email = ?',
      [email]
    );
    if (!user) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }

    // Проверяем пароль
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }

    // Создаём JWT
    const token = createToken(user.id);

    // Отправляем ответ с cookie
    const response = NextResponse.json({ user: { id: user.id, email: user.email } });
    setTokenCookie(response, token);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}