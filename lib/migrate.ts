import { createClient } from '@libsql/client';
import type { InValue } from '@libsql/client';
import { SCHEMA } from './db';

// Переносит данные из локального SQLite-файла (data.db) в Turso.
// Запуск: npm run migrate

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Для миграции задайте TURSO_DATABASE_URL и TURSO_AUTH_TOKEN в .env.local');
  process.exit(1);
}

const LOCAL_PATH = process.env.LOCAL_DATABASE_PATH ?? 'file:./data.db';
const local = createClient({ url: LOCAL_PATH });
const remote = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function copyTable(name: string): Promise<void> {
  const res = await local.execute(`SELECT * FROM "${name}"`);
  if (res.rows.length === 0) {
    console.log(`Таблица ${name}: пусто, пропущено`);
    return;
  }

  const countRes = await remote.execute(`SELECT COUNT(*) AS count FROM "${name}"`);
  const count = Number((countRes.rows[0] as Record<string, InValue>).count ?? 0);
  if (count > 0) {
    console.log(`Таблица ${name}: пропущено (уже есть ${count} строк)`);
    return;
  }

  const cols = res.columns;
  const insert = `INSERT INTO "${name}" (${cols.map((c) => `"${c}"`).join(', ')})
    VALUES (${cols.map(() => '?').join(', ')})`;

  for (const row of res.rows) {
    const args = cols.map((c) => (row[c] ?? null) as InValue);
    await remote.execute({ sql: insert, args });
  }
  console.log(`Таблица ${name}: скопировано ${res.rows.length} строк`);
}

async function main() {
  await remote.executeMultiple(SCHEMA);
  // Порядок важен из-за внешних ключей
  for (const table of ['users', 'books', 'courses', 'subscriptions', 'course_purchases', 'book_covers', 'site_settings']) {
    await copyTable(table);
  }
  console.log('Миграция завершена');
}

main().catch((err) => {
  console.error('Ошибка миграции:', err);
  process.exit(1);
});
