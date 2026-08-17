import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 МБ

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Поддерживаются только изображения: JPEG, PNG, WebP, GIF, AVIF' },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Размер файла не должен превышать 2 МБ' },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { lastInsertRowid } = await run(
      'INSERT INTO book_covers (data, mime, size) VALUES (?, ?, ?)',
      [bytes, file.type, file.size]
    );

    return NextResponse.json(
      { url: `/api/covers/${lastInsertRowid}` },
      { status: 201 }
    );
  } catch (error) {
    console.error('Cover upload error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
