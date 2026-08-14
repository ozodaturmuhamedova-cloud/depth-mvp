import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/db';
import { getUserIdFromRequest, hasActiveSubscription } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!(await hasActiveSubscription(userId))) {
      return NextResponse.json({ error: 'Нет активной подписки' }, { status: 403 });
    }

    const { slug } = await params; // <-- await
    const book = await get<{ content: string }>(
      'SELECT content FROM books WHERE slug = ?',
      [slug]
    );
    if (!book) {
      return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 });
    }

    return NextResponse.json({ content: book.content });
  } catch (error) {
    console.error('Book read error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}