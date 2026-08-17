import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { convertDocxToHtml } from '@/lib/docx';
import { rateLimit } from '@/lib/rate-limit';
import { isTrustedOrigin } from '@/lib/csrf';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 МБ
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
// .docx — это ZIP-архив; первые 4 байта любого ZIP-файла всегда эта сигнатура.
// Расширению и Content-Type, присланным клиентом, доверять нельзя.
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

function hasZipSignature(bytes: Uint8Array): boolean {
  return ZIP_SIGNATURE.every((byte, i) => bytes[i] === byte);
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }

  const limit = rateLimit(request, 'import-docx', 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ error: 'Поддерживаются только файлы .docx' }, { status: 400 });
    }
    if (file.type && file.type !== DOCX_MIME) {
      return NextResponse.json({ error: 'Поддерживаются только файлы .docx' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Размер файла не должен превышать 20 МБ' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (!hasZipSignature(bytes)) {
      return NextResponse.json(
        { error: 'Файл повреждён или не является настоящим .docx' },
        { status: 400 }
      );
    }

    const { html, chaptersCount, title } = await convertDocxToHtml(Buffer.from(arrayBuffer));

    if (!html.trim()) {
      return NextResponse.json(
        { error: 'Не удалось извлечь текст из документа' },
        { status: 422 }
      );
    }

    return NextResponse.json({ html, format: 'html', chaptersCount, title }, { status: 200 });
  } catch (error) {
    console.error('Docx import error:', error);
    return NextResponse.json({ error: 'Не удалось обработать .docx файл' }, { status: 500 });
  }
}
