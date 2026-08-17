import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { detectImageMime } from '@/lib/file-signatures';
import { isTrustedOrigin } from '@/lib/csrf';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 МБ

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Размер файла не должен превышать 2 МБ' },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    // Client-Type подделываем не доверяем: определяем реальный тип по
    // сигнатуре файла (magic bytes), чтобы нельзя было залить полиглот/HTML
    // под видом изображения.
    const detectedMime = detectImageMime(bytes);
    if (!detectedMime) {
      return NextResponse.json(
        { error: 'Поддерживаются только изображения: JPEG, PNG, WebP, GIF, AVIF' },
        { status: 400 }
      );
    }

    const { lastInsertRowid } = await run(
      'INSERT INTO book_covers (data, mime, size) VALUES (?, ?, ?)',
      [bytes, detectedMime, file.size]
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
