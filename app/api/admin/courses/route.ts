import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  try {
    const courses = await all('SELECT * FROM courses ORDER BY id DESC');
    return NextResponse.json({ courses });
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
    const { title, description, price_cents, lessons } = body;
    if (!title || !price_cents || !lessons) {
      return NextResponse.json({ error: 'title, price_cents и lessons обязательны' }, { status: 400 });
    }
    await run(
      `INSERT INTO courses (title, description, price_cents, lessons)
       VALUES (?, ?, ?, ?)`,
      [title, description || null, price_cents, JSON.stringify(lessons)]
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
