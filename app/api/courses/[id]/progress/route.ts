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

    const body = await request.json();
    const { lessonIndex } = body;
    if (!Number.isInteger(lessonIndex) || lessonIndex < 0) {
      return NextResponse.json({ error: 'lessonIndex должен быть неотрицательным целым числом' }, { status: 400 });
    }

    const course = await get<{ lessons: string }>(
      'SELECT lessons FROM courses WHERE id = ?',
      [courseId]
    );
    if (!course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });
    }
    const lessonCount = (JSON.parse(course.lessons) as unknown[]).length;
    if (lessonIndex >= lessonCount) {
      return NextResponse.json({ error: 'Неверный номер урока' }, { status: 400 });
    }

    const purchase = await get<{ progress: string }>(
      'SELECT progress FROM course_purchases WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    if (!purchase) {
      return NextResponse.json({ error: 'Курс не куплен' }, { status: 403 });
    }

    const progress: number[] = JSON.parse(purchase.progress || '[]');
    if (!progress.includes(lessonIndex)) {
      progress.push(lessonIndex);
      await run(
        'UPDATE course_purchases SET progress = ? WHERE user_id = ? AND course_id = ?',
        [JSON.stringify(progress), userId, courseId]
      );
    }

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Course progress error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}