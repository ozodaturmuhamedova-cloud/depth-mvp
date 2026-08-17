import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  try {
    const { id } = await params;
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Неверный ID курса' }, { status: 400 });
    }
    const body = await request.json();
    const { title, description, price_cents, lessons } = body;
    if (!title || typeof price_cents !== 'number' || price_cents < 0 || !lessons) {
      return NextResponse.json(
        { error: 'title, price_cents (>= 0) и lessons обязательны' },
        { status: 400 }
      );
    }
    await run(
      'UPDATE courses SET title=?, description=?, price_cents=?, lessons=? WHERE id=?',
      [title, description || null, price_cents, JSON.stringify(lessons), courseId]
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
  try {
    const { id } = await params;
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Неверный ID курса' }, { status: 400 });
    }
    await run('DELETE FROM course_purchases WHERE course_id = ?', [courseId]);
    await run('DELETE FROM courses WHERE id = ?', [courseId]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
