import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/db';

interface CoverRow {
  data: ArrayBuffer;
  mime: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const coverId = parseInt(id);
  if (isNaN(coverId)) {
    return NextResponse.json({ error: 'Неверный ID обложки' }, { status: 400 });
  }

  const cover = await get<CoverRow>(
    'SELECT data, mime FROM book_covers WHERE id = ?',
    [coverId]
  );
  if (!cover) {
    return NextResponse.json({ error: 'Обложка не найдена' }, { status: 404 });
  }

  return new NextResponse(cover.data, {
    headers: {
      'Content-Type': cover.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
