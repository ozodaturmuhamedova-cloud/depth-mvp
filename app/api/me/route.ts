import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { get } from '@/lib/db';
import type { User } from '@/lib/types';

export async function GET() {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const user = await get<User>(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
    [userId]
  );
  if (!user) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
  }

  return NextResponse.json({ user });
}