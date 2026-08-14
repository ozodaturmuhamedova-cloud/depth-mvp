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
    const bookId = parseInt(id);
    if (isNaN(bookId)) {
      return NextResponse.json({ error: 'Неверный ID книги' }, { status: 400 });
    }

    const body = await request.json();
    const { slug, title, author, description, category, content, preview, cover_url } = body;
    await run(
      `UPDATE books SET slug=?, title=?, author=?, description=?, category=?, content=?, preview=?, cover_url=?
       WHERE id=?`,
      [slug, title, author || null, description || null, category || null, content, preview || null, cover_url || null, bookId]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Книга с таким slug уже существует' }, { status: 409 });
    }
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
    const bookId = parseInt(id);
    if (isNaN(bookId)) {
      return NextResponse.json({ error: 'Неверный ID книги' }, { status: 400 });
    }
    await run('DELETE FROM books WHERE id = ?', [bookId]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
