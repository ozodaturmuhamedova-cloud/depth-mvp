import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

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
  try {
    const body = await request.json();
    const { slug, title, author, description, category, content, preview, cover_url } = body;
    if (!slug || !title || !content) {
      return NextResponse.json({ error: 'slug, title и content обязательны' }, { status: 400 });
    }
    await run(
      `INSERT INTO books (slug, title, author, description, category, content, preview, cover_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, title, author || null, description || null, category || null, content, preview || null, cover_url || null]
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Книга с таким slug уже существует' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
