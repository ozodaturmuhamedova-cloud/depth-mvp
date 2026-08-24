import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { courseSchema, formatZodError } from '@/lib/validation';
import { isTrustedOrigin } from '@/lib/csrf';

interface CourseRow {
  id: number;
  title: string;
  description: string | null;
  telegram_url: string | null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  try {
    const courses = await all<CourseRow>('SELECT * FROM courses ORDER BY id DESC');
    return NextResponse.json({ courses });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const parsed = courseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { title, description, telegram_url } = parsed.data;
    await run(
      `INSERT INTO courses (title, description, telegram_url)
       VALUES (?, ?, ?)`,
      [title, description || null, telegram_url]
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
