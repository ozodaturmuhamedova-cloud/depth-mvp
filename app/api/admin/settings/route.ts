import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { siteSettingsSchema, formatZodError } from '@/lib/validation';
import { isTrustedOrigin } from '@/lib/csrf';
import type { SiteSettings } from '@/lib/types';

const SETTINGS_KEYS = ['hero_image_url', 'hero_author_name', 'hero_author_role'] as const;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  try {
    const rows = await all<{ key: string; value: string }>('SELECT key, value FROM site_settings');
    const settings: SiteSettings = {
      hero_image_url: null,
      hero_author_name: null,
      hero_author_role: null,
    };
    for (const row of rows) {
      if ((SETTINGS_KEYS as readonly string[]).includes(row.key)) {
        (settings as unknown as Record<string, string>)[row.key] = row.value;
      }
    }
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const parsed = siteSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    for (const key of SETTINGS_KEYS) {
      const value = parsed.data[key] ?? '';
      await run(
        `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, value]
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
