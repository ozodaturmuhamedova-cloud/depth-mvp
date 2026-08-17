import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db';
import { hashPassword, createToken, setTokenCookie, normalizeEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email || '');
    const password = body.password;
    const name = body.name;

    // Простая валидация
    if (!email || !password) {
      return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Пароль должен быть минимум 6 символов' }, { status: 400 });
    }

    // Проверяем, нет ли уже такого пользователя
    const existing = await get<{ id: number }>('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 409 });
    }

    // Хешируем пароль
    const passwordHash = await hashPassword(password);

    // Сохраняем пользователя
    const result = await run(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, passwordHash, name || null]
    );

    const userId = result.lastInsertRowid;

    // Создаём JWT
    const token = createToken(userId);

    // Отправляем ответ с cookie
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