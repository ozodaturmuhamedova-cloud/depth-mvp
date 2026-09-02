import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import type { AdminUserDetail } from '@/lib/types';

interface UserRow {
  id: number;
  telegram_id: number | null;
  telegram_username: string | null;
  email: string | null;
  name: string | null;
  role: 'user' | 'admin';
  created_at: string;
  last_login_at: string | null;
}

interface SubscriptionRow {
  plan: string;
  active_until: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Неверный ID пользователя' }, { status: 400 });
    }

    const user = await get<UserRow>(
      'SELECT id, telegram_id, telegram_username, email, name, role, created_at, last_login_at FROM users WHERE id = ?',
      [userId]
    );
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Показываем подписку, даже если она уже истекла — это часть истории,
    // которая нужна администратору для принятия решения о продлении.
    const subscriptionRow = await get<SubscriptionRow>(
      'SELECT plan, active_until FROM subscriptions WHERE user_id = ?',
      [userId]
    );

    const detail: AdminUserDetail = {
      ...user,
      subscription: subscriptionRow
        ? { plan: subscriptionRow.plan, active_until: subscriptionRow.active_until }
        : null,
    };

    return NextResponse.json({ user: detail });
  } catch (error) {
    console.error('Admin user detail error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
