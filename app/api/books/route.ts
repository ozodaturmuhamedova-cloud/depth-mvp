import { NextResponse } from 'next/server';
import { all } from '@/lib/db';

export async function GET() {
  try {
    const books = await all(`
      SELECT id, slug, title, author, description, category, preview, cover_url 
      FROM books
    `);
    return NextResponse.json({ books });
  } catch (error) {
    console.error('Books list error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}