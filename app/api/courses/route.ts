import { NextRequest, NextResponse } from 'next/server';
import { all } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const languageParam = request.nextUrl.searchParams.get('language');
    const language = languageParam === 'ru' || languageParam === 'uz' ? languageParam : null;

    const courses = language
      ? await all(
          `SELECT id, title, description, telegram_url, language
           FROM courses WHERE language = ?`,
          [language]
        )
      : await all(`
          SELECT id, title, description, telegram_url, language
          FROM courses
        `);
    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Courses list error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
