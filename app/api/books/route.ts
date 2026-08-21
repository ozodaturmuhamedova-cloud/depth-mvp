import { NextRequest, NextResponse } from 'next/server';
import { all } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const languageParam = request.nextUrl.searchParams.get('language');
    // Некорректное/произвольное значение игнорируем и отдаём книги на всех
    // языках, а не 400 — параметр опциональный.
    const language = languageParam === 'ru' || languageParam === 'uz' ? languageParam : null;

    const books = language
      ? await all(
          `SELECT id, slug, title, author, description, category, preview, cover_url, content_format, language
           FROM books WHERE language = ?`,
          [language]
        )
      : await all(`
          SELECT id, slug, title, author, description, category, preview, cover_url, content_format, language
          FROM books
        `);
    return NextResponse.json({ books });
  } catch (error) {
    console.error('Books list error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}