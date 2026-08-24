import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { grantSubscriptionSchema, formatZodError } from '@/lib/validation';
import { isTrustedOrigin } from '@/lib/csrf';

const PLAN_DURATION_DAYS: Record<'month' | 'year', number> = {
  month: 30,
  year: 365,
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Неверный ID пользователя' }, { status: 400 });
    }

    const targetUser = await get<{ id: number }>('SELECT id FROM users WHERE id = ?', [userId]);
    if (!targetUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = grantSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { plan, days } = parsed.data;

    const durationDays = days ?? PLAN_DURATION_DAYS[plan!];
    const activeUntil = new Date();
    activeUntil.setDate(activeUntil.getDate() + durationDays);
    const activeUntilStr = activeUntil.toISOString();
    // Если задан только days, план всё равно должен быть сохранён — берём
    // ближайший по смыслу, иначе колонка plan (NOT NULL) осталась бы пустой.
    const planValue = plan ?? (durationDays > 180 ? 'year' : 'month');

    await run(
      `INSERT INTO subscriptions (user_id, plan, active_until) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET plan = excluded.plan, active_until = excluded.active_until`,
      [userId, planValue, activeUntilStr]
    );

    return NextResponse.json({ success: true, active_until: activeUntilStr });
  } catch (error) {
    console.error('Admin grant subscription error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Неверный ID пользователя' }, { status: 400 });
    }

    await run('DELETE FROM subscriptions WHERE user_id = ?', [userId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin revoke subscription error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
