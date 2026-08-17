import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { subscribeSchema, formatZodError } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { isTrustedOrigin } from '@/lib/csrf';

// Длительность плана задаётся сервером, а не клиентом — иначе тело запроса
// могло бы указать произвольный срок действия подписки.
const PLAN_DURATION_DAYS: Record<'month' | 'year', number> = {
  month: 30,
  year: 365,
};

// В проекте нет интеграции с платёжным провайдером (Stripe/ЮKassa и т.п.).
// Без явного флага выдавать платный доступ бесплатно нельзя — это была
// дыра, позволявшая любому авторизованному пользователю получить полный
// доступ к книгам без оплаты. Флаг оставлен только для локальной разработки.
const ALLOW_FREE_SUBSCRIPTIONS = process.env.ALLOW_FREE_SUBSCRIPTIONS === 'true';

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }

  const limit = rateLimit(request, 'subscribe', 20, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!ALLOW_FREE_SUBSCRIPTIONS) {
      return NextResponse.json(
        { error: 'Оплата подписки временно недоступна. Обратитесь в поддержку' },
        { status: 402 }
      );
    }

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { plan } = parsed.data;

    const activeUntil = new Date();
    activeUntil.setDate(activeUntil.getDate() + PLAN_DURATION_DAYS[plan]);
    // Храним в ISO-8601 UTC, чтобы не зависеть от часового пояса сервера
    const activeUntilStr = activeUntil.toISOString();

    // Идемпотентный upsert вместо DELETE+INSERT: уникальный индекс
    // subscriptions(user_id) (см. lib/db.ts) исключает дубли при параллельных запросах.
    await run(
      `INSERT INTO subscriptions (user_id, plan, active_until) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET plan = excluded.plan, active_until = excluded.active_until`,
      [userId, plan, activeUntilStr]
    );

    return NextResponse.json({ success: true, active_until: activeUntilStr }, { status: 201 });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
