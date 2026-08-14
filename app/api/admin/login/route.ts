import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminUser, get } from '@/lib/db';
import { comparePassword, createToken, setTokenCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: 'Пароль обязателен' }, { status: 400 });
    }

    await ensureAdminUser();

    const admin = await get<{ id: number; password_hash: string }>(
      'SELECT id, password_hash FROM users WHERE role = ?',
      ['admin']
    );
    if (!admin) {
      return NextResponse.json(
        { error: 'Администратор не настроен. Укажите ADMIN_PASSWORD в переменных окружения' },
        { status: 500 }
      );
    }

    const valid = await comparePassword(password, admin.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
    }

    const token = createToken(admin.id);
    const response = NextResponse.json({ success: true });
    setTokenCookie(response, token);
    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
