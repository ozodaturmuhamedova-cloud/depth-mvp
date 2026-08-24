import { NextResponse } from 'next/server';
import { all } from '@/lib/db';

export async function GET() {
  try {
    const courses = await all(`
      SELECT id, title, description, telegram_url FROM courses
    `);
    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Courses list error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}