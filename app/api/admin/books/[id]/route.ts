import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { bookSchema, formatZodError } from '@/lib/validation';
import { sanitizeBookHtml } from '@/lib/docx';
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
    const bookId = parseInt(id);
    if (isNaN(bookId)) {
      return NextResponse.json({ error: 'Неверный ID книги' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = bookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { slug, title, author, description, category, preview, cover_url, content_format } = parsed.data;
    const content = content_format === 'html' ? sanitizeBookHtml(parsed.data.content) : parsed.data.content;

    await run(
      `UPDATE books SET slug=?, title=?, author=?, description=?, category=?, content=?, preview=?, cover_url=?, content_format=?
       WHERE id=?`,
      [slug, title, author || null, description || null, category || null, content, preview || null, cover_url || null, content_format, bookId]
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
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
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
