import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { courseSchema, formatZodError } from '@/lib/validation';
import { isTrustedOrigin } from '@/lib/csrf';

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
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Неверный ID курса' }, { status: 400 });
    }
    const body = await request.json();
    const parsed = courseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { title, description, telegram_url, cover_url, language } = parsed.data;
    await run(
      'UPDATE courses SET title=?, description=?, telegram_url=?, cover_url=?, language=? WHERE id=?',
      [title, description || null, telegram_url, cover_url || null, language, courseId]
    );
    return NextResponse.json({ success: true });
  } catch {
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
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Неверный ID курса' }, { status: 400 });
    }
    await run('DELETE FROM courses WHERE id = ?', [courseId]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
