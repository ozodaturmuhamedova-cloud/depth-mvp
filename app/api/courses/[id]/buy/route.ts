import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
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
