import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/db';
import type { BookSummary } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params; // <-- await
    const book = await get<BookSummary>(
      `SELECT id, slug, title, author, description, category, preview, cover_url
       FROM books WHERE slug = ?`,
      [slug]
    );

    if (!book) {
      return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 });
    }

    return NextResponse.json({ book });
  } catch (error) {
    console.error('Book detail error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}