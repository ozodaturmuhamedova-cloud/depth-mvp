import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import type { CoursePurchaseRow, CourseSummary } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // <-- await
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Неверный ID курса' }, { status: 400 });
    }

    const course = await get<CourseSummary>(
      'SELECT id, title, description, price_cents FROM courses WHERE id = ?',
      [courseId]
    );

    if (!course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });
    }

    const userId = await getUserIdFromRequest();
    let purchased = false;
    let progress: number[] = [];
    let lessons = null;

    if (userId) {
      const purchase = await get<Pick<CoursePurchaseRow, 'progress'>>(
        'SELECT progress FROM course_purchases WHERE user_id = ? AND course_id = ?',
        [userId, courseId]
      );
      if (purchase) {
        purchased = true;
        progress = JSON.parse(purchase.progress || '[]') as number[];
        const courseData = await get<{ lessons: string }>(
          'SELECT lessons FROM courses WHERE id = ?',
          [courseId]
        );
        lessons = courseData ? JSON.parse(courseData.lessons) : null;
      }
    }

    return NextResponse.json({
      course: {
        ...course,
        purchased,
        progress,
        lessons,
      }
    });
  } catch (error) {
    console.error('Course detail error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
