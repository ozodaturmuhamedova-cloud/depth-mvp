import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { isTrustedOrigin } from '@/lib/csrf';

// См. app/api/subscribe/route.ts — платежи ещё не подключены, поэтому без
// явного флага бесплатная "покупка" курса запрещена.
const ALLOW_FREE_SUBSCRIPTIONS = process.env.ALLOW_FREE_SUBSCRIPTIONS === 'true';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }

  const limit = rateLimit(request, 'course-buy', 20, 15 * 60 * 1000);
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
        { error: 'Оплата курса временно недоступна. Обратитесь в поддержку' },
        { status: 402 }
      );
    }

    const { id } = await params; // <-- await
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Неверный ID курса' }, { status: 400 });
    }

    const course = await get<{ id: number }>(
      'SELECT id FROM courses WHERE id = ?',
      [courseId]
    );
    if (!course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });
    }

    const existing = await get<{ id: number }>(
      'SELECT id FROM course_purchases WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    if (existing) {
      return NextResponse.json({ error: 'Курс уже куплен' }, { status: 409 });
    }

    await run(
      'INSERT INTO course_purchases (user_id, course_id) VALUES (?, ?)',
      [userId, courseId]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Курс уже куплен' }, { status: 409 });
    }
    console.error('Course buy error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
