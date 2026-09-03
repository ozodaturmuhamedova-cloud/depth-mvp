import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { siteSettingsSchema, formatZodError } from '@/lib/validation';
import { isTrustedOrigin } from '@/lib/csrf';
import { SITE_SETTINGS_KEYS, emptySiteSettings, getSiteSettings } from '@/lib/site-settings';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  try {
    const settings = await getSiteSettings();
    return NextResponse.json({ settings: settings ?? emptySiteSettings() });
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

    for (const key of SITE_SETTINGS_KEYS) {
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
