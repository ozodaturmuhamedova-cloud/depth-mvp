import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { plan } = body;

    if (!plan || !['month', 'year'].includes(plan)) {
      return NextResponse.json({ error: 'План должен быть month или year' }, { status: 400 });
    }

    let durationDays = 30;
    if (plan === 'year') durationDays = 365;

    const activeUntil = new Date();
    activeUntil.setDate(activeUntil.getDate() + durationDays);
    // Храним в ISO-8601 UTC, чтобы не зависеть от часового пояса сервера
    const activeUntilStr = activeUntil.toISOString();

    // Удаляем старые подписки пользователя (для простоты)
    await run('DELETE FROM subscriptions WHERE user_id = ?', [userId]);

    await run(
      'INSERT INTO subscriptions (user_id, plan, active_until) VALUES (?, ?, ?)',
      [userId, plan, activeUntilStr]
    );

    return NextResponse.json({ success: true, active_until: activeUntilStr }, { status: 201 });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}