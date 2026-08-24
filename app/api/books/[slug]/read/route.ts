import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/db';
import { getCurrentUser, hasActiveSubscription } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // У администратора подписка всегда «активна» — доступ ко всем книгам
    // без отдельной записи в таблице subscriptions.
    if (user.role !== 'admin' && !(await hasActiveSubscription(user.id))) {
      return NextResponse.json({ error: 'Нет активной подписки' }, { status: 403 });
    }

    const { slug } = await params; // <-- await
    const book = await get<{ content: string; content_format: 'text' | 'html' }>(
      'SELECT content, content_format FROM books WHERE slug = ?',
      [slug]
    );
    if (!book) {
      return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 });
    }

    return NextResponse.json({ content: book.content, format: book.content_format });
  } catch (error) {
    console.error('Book read error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}