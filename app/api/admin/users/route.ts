import { NextRequest, NextResponse } from 'next/server';
import { all, get } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import type { AdminUserListItem } from '@/lib/types';

type RoleFilter = 'all' | 'user' | 'admin';
type SubFilter = 'all' | 'active' | 'none';
type SortOption = 'created_desc' | 'created_asc' | 'name_asc';

const SORT_CLAUSES: Record<SortOption, string> = {
  created_desc: 'u.created_at DESC, u.id DESC',
  created_asc: 'u.created_at ASC, u.id ASC',
  name_asc: 'COALESCE(u.name, u.telegram_username, "") ASC',
};

const PER_PAGE_OPTIONS = [10, 25, 50];

// LIKE-паттерн с экранированием служебных символов `%`/`_`/экранирующего
// символа, иначе поиск по "50%" или "a_b" вёл бы себя не как обычный текст.
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const q = (searchParams.get('q') ?? '').trim();
    const roleParam = searchParams.get('role');
    const role: RoleFilter = roleParam === 'user' || roleParam === 'admin' ? roleParam : 'all';
    const subParam = searchParams.get('sub');
    const sub: SubFilter = subParam === 'active' || subParam === 'none' ? subParam : 'all';
    const sortParam = searchParams.get('sort');
    const sort: SortOption =
      sortParam === 'created_asc' || sortParam === 'name_asc' ? sortParam : 'created_desc';

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const requestedPerPage = parseInt(searchParams.get('perPage') ?? '25', 10);
    const perPage = PER_PAGE_OPTIONS.includes(requestedPerPage) ? requestedPerPage : 25;
    const offset = (page - 1) * perPage;

    const likePattern = q ? `%${escapeLikePattern(q)}%` : '';

    // Плейсхолдеры повторяются, где нужно одно и то же значение дважды —
    // драйвер biндит только позиционные `?`, без нумерованных `?NNN`.
    const whereClause = `
      WHERE (? = '' OR COALESCE(u.telegram_username, '') LIKE ? ESCAPE '\\'
        OR COALESCE(u.name, '') LIKE ? ESCAPE '\\'
        OR CAST(u.telegram_id AS TEXT) LIKE ? ESCAPE '\\')
        AND (? = 'all' OR u.role = ?)
        AND (
          ? = 'all'
          OR (? = 'active' AND s.active_until IS NOT NULL AND datetime(s.active_until) > datetime('now'))
          OR (? = 'none' AND (s.active_until IS NULL OR datetime(s.active_until) <= datetime('now')))
        )
    `;
    const whereArgs = [q, likePattern, likePattern, likePattern, role, role, sub, sub, sub];

    const countRow = await get<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       ${whereClause}`,
      whereArgs
    );
    const total = countRow?.total ?? 0;

    const users = await all<AdminUserListItem>(
      `SELECT u.id, u.telegram_id, u.telegram_username, u.email, u.name, u.role, u.created_at, u.last_login_at,
              s.plan AS subscription_plan, s.active_until AS subscription_active_until
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       ${whereClause}
       ORDER BY ${SORT_CLAUSES[sort]}
       LIMIT ? OFFSET ?`,
      [...whereArgs, perPage, offset]
    );

    return NextResponse.json({ users, total, page, perPage });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
