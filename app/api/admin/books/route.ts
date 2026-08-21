import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { bookSchema, formatZodError } from '@/lib/validation';
import { sanitizeBookHtml } from '@/lib/docx';
import { isTrustedOrigin } from '@/lib/csrf';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  try {
    const books = await all('SELECT * FROM books ORDER BY id DESC');
    return NextResponse.json({ books });
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
    const parsed = bookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { slug, title, author, description, category, cover_url, content_format } = parsed.data;
    // Контент из .docx-импорта уже санитизирован на этапе конвертации, но
    // повторная санитизация здесь — независимая гарантия на случай, если
    // клиент отредактировал HTML вручную перед сохранением. Превью рендерится
    // через dangerouslySetInnerHTML на странице книги, поэтому тоже санитизируем.
    const content = content_format === 'html' ? sanitizeBookHtml(parsed.data.content) : parsed.data.content;
    const preview =
      content_format === 'html' && parsed.data.preview ? sanitizeBookHtml(parsed.data.preview) : parsed.data.preview;

    await run(
      `INSERT INTO books (slug, title, author, description, category, content, preview, cover_url, content_format)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, title, author || null, description || null, category || null, content, preview || null, cover_url || null, content_format]
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Книга с таким slug уже существует' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
