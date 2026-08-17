import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { all } from '@/lib/db';

interface PurchasedCourseRow {
  course_id: number;
  progress: string;
  title: string;
}

export async function GET() {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const purchases = await all<PurchasedCourseRow>(`
    SELECT cp.course_id, cp.progress, c.title
    FROM course_purchases cp
    JOIN courses c ON c.id = cp.course_id
    WHERE cp.user_id = ?
  `, [userId]);

  const courses = purchases.map((p) => {
    let progress: number[] = [];
    try {
      progress = JSON.parse(p.progress || '[]') as number[];
    } catch {
      progress = [];
    }
    return {
      id: p.course_id,
      title: p.title,
      progress,
    };
  });

  return NextResponse.json({ courses });
}
