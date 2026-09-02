// Осознанно БЕЗ 'server-only': этот модуль импортируется не только из
// приложения Next.js, но и напрямую через tsx в lib/seed.ts и lib/migrate.ts
// (npm run seed / npm run migrate), которые выполняются вне рантайма React
// Server Components — 'server-only' там всегда падает (условие exports
// "react-server" не выставляется). В браузерный бандл этот модуль и так не
// попадёт: он использует @libsql/client (сетевые сокеты/fs), несовместимый
// с браузерным окружением.
import { createClient, LibsqlError } from '@libsql/client';
import type { InValue, Row } from '@libsql/client';

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

// Если TURSO_DATABASE_URL не задан, используем локальный SQLite-файл (для разработки)
const url = TURSO_URL || 'file:./data.db';
if (TURSO_URL && !TURSO_TOKEN) {
  throw new Error('TURSO_AUTH_TOKEN must be set when TURSO_DATABASE_URL is configured');
}

export const db = createClient({
  url,
  authToken: TURSO_TOKEN || undefined,
});

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE,
    telegram_username TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now')),
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    category TEXT,
    content TEXT NOT NULL,
    preview TEXT,
    cover_url TEXT,
    content_format TEXT NOT NULL DEFAULT 'text',
    language TEXT NOT NULL DEFAULT 'ru'
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    telegram_url TEXT,
    language TEXT NOT NULL DEFAULT 'ru'
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan TEXT NOT NULL,
    active_until TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS book_covers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data BLOB NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

async function initializeDatabase() {
  await db.executeMultiple(SCHEMA);
  await migrate();
}

// Лёгкая миграция для уже существующих баз
async function migrate() {
  await db.execute('PRAGMA foreign_keys = ON');

  const res = await db.execute('PRAGMA table_info(users)');
  const userColumns = res.rows as unknown as { name: string }[];
  if (!userColumns.some((c) => c.name === 'role')) {
    await db.execute(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
  }
  if (!userColumns.some((c) => c.name === 'last_login_at')) {
    await db.execute(`ALTER TABLE users ADD COLUMN last_login_at TEXT`);
  }

  // Миграция на Telegram-авторизацию: telegram_id, nullable email/password.
  if (!userColumns.some((c) => c.name === 'telegram_id')) {
    const tablesRes = await db.execute(
      `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'users_new')`
    );
    const tableNames = new Set(
      (tablesRes.rows as unknown as { name: string }[]).map((row) => row.name)
    );

    if (tableNames.has('users_new') && !tableNames.has('users')) {
      // Прерванная миграция: users уже удалён, остался только users_new.
      await db.execute('ALTER TABLE users_new RENAME TO users');
    } else {
      await db.execute('DROP TABLE IF EXISTS users_new');
      await db.execute(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id INTEGER UNIQUE,
          telegram_username TEXT,
          email TEXT UNIQUE,
          password_hash TEXT,
          name TEXT,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TEXT DEFAULT (datetime('now')),
          last_login_at TEXT
        )
      `);
      await db.execute(`
        INSERT INTO users_new (id, email, password_hash, name, role, created_at, last_login_at)
        SELECT id, email, password_hash, name, role, created_at, last_login_at FROM users
      `);
      await db.execute('DROP TABLE users');
      await db.execute('ALTER TABLE users_new RENAME TO users');
    }
  }

  const booksRes = await db.execute('PRAGMA table_info(books)');
  const bookColumns = booksRes.rows as unknown as { name: string }[];
  if (!bookColumns.some((c) => c.name === 'content_format')) {
    await db.execute(`ALTER TABLE books ADD COLUMN content_format TEXT NOT NULL DEFAULT 'text'`);
  }
  if (!bookColumns.some((c) => c.name === 'language')) {
    // DEFAULT 'ru' на уже существующей колонке присваивает всем текущим книгам
    // русский язык автоматически, без отдельного UPDATE.
    await db.execute(`ALTER TABLE books ADD COLUMN language TEXT NOT NULL DEFAULT 'ru'`);
  }
  // Подчищаем значения, которые могли попасть в обход схемы (ручные правки БД).
  await db.execute(`UPDATE books SET language = 'ru' WHERE language IS NULL OR language NOT IN ('ru', 'uz')`);

  // Обложки допускаются только как локальные файлы (/api/covers/...), см.
  // next.config.ts (images.remotePatterns пуст). Чистим внешние URL,
  // оставшиеся от старого сида (например, via.placeholder.com) — next/image
  // упадёт рантайм-ошибкой на неразрешённом хосте.
  await db.execute(`UPDATE books SET cover_url = NULL WHERE cover_url IS NOT NULL AND cover_url NOT LIKE '/%'`);

  // Курсы больше не продаются напрямую — только название, описание и ссылка
  // на Telegram-канал. Старая схема (price_cents/lessons) и таблица покупок
  // course_purchases пересобираются один раз, без ORM/миграционных файлов.
  const coursesRes = await db.execute('PRAGMA table_info(courses)');
  const courseColumns = coursesRes.rows as unknown as { name: string }[];
  if (courseColumns.some((c) => c.name === 'price_cents')) {
    await db.execute('DROP TABLE IF EXISTS course_purchases');
    await db.execute(`
      CREATE TABLE courses_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        telegram_url TEXT
      )
    `);
    await db.execute('INSERT INTO courses_new (id, title, description) SELECT id, title, description FROM courses');
    await db.execute('DROP TABLE courses');
    await db.execute('ALTER TABLE courses_new RENAME TO courses');
  }

  const coursesResAfter = await db.execute('PRAGMA table_info(courses)');
  const courseColumnsAfter = coursesResAfter.rows as unknown as { name: string }[];
  if (!courseColumnsAfter.some((c) => c.name === 'language')) {
    await db.execute(`ALTER TABLE courses ADD COLUMN language TEXT NOT NULL DEFAULT 'ru'`);
  }
  await db.execute(`UPDATE courses SET language = 'ru' WHERE language IS NULL OR language NOT IN ('ru', 'uz')`);

  // Не более одной активной подписки на пользователя — исключает дубли
  // при параллельных запросах на выдачу подписки из админ-панели.
  await db.execute(`
    DELETE FROM subscriptions
    WHERE id NOT IN (
      SELECT MIN(id) FROM subscriptions GROUP BY user_id
    )
  `);
  await db.execute(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)'
  );

  // Гарантия единственного администратора на уровне БД: частичный уникальный
  // индекс физически запрещает существование второй строки с role='admin'.
  await db.execute(`
    DELETE FROM users
    WHERE role = 'admin' AND id NOT IN (
      SELECT MIN(id) FROM users WHERE role = 'admin'
    )
  `);
  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_single_admin ON users(role) WHERE role = 'admin'`
  );
}

// Удалённая Turso-база (HTTP-транспорт) иногда "засыпает" при простое —
// первый запрос после паузы может не уложиться в таймаут fetch и упасть с
// "TypeError: fetch failed", хотя соединение полностью рабочее. Ретраим
// только сетевые/временные ошибки — реальные ошибки SQL (например, UNIQUE
// constraint) не трогаем, чтобы не менять поведение обработки таких ошибок
// выше по стеку (register/books/etc. проверяют текст сообщения).
function isTransientNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && /fetch failed/i.test(err.message)) return true;
  const cause = (err as { cause?: { code?: string } } | undefined)?.cause;
  const code = cause?.code;
  return !!code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET'].includes(code);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4, baseDelayMs = 300): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientNetworkError(err) || attempt === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }
  throw lastErr;
}

// Ленивая инициализация схемы: выполняется один раз на инстанс функции.
// initializeDatabase() состоит из идемпотентных операций (IF NOT EXISTS,
// проверки перед INSERT), поэтому безопасно повторить её целиком при сбое.
let initialized: Promise<void> | null = null;

export function ensureInitialized(): Promise<void> {
  if (!initialized) {
    initialized = withRetry(() => initializeDatabase()).catch((err) => {
      initialized = null;
      throw err;
    });
  }
  return initialized;
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

// SELECT c множеством строк
export async function all<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
  await ensureInitialized();
  const res = await withRetry(() => db.execute({ sql, args }));
  return res.rows as unknown as T[];
}

// SELECT одной строки (undefined, если ничего нет)
export async function get<T = Row>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  await ensureInitialized();
  const res = await withRetry(() => db.execute({ sql, args }));
  return res.rows[0] as unknown as T | undefined;
}

// INSERT / UPDATE / DELETE
export async function run(sql: string, args: InValue[] = []): Promise<RunResult> {
  await ensureInitialized();
  const res = await withRetry(() => db.execute({ sql, args }));
  return {
    changes: res.rowsAffected,
    lastInsertRowid: res.lastInsertRowid == null ? 0 : Number(res.lastInsertRowid),
  };
}

// Публичная обёртка для вызова вне initializeDatabase(), если понадобится
// пересоздать/повысить админа вручную вне цикла инициализации БД.
export async function ensureAdminUser(): Promise<void> {
  await ensureInitialized();
}

export { LibsqlError };
export default db;
