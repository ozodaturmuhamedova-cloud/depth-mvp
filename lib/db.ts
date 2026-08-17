import { createClient, LibsqlError } from '@libsql/client';
import type { InValue, Row } from '@libsql/client';
import bcrypt from 'bcryptjs';

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
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
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
    cover_url TEXT
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    lessons TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan TEXT NOT NULL,
    active_until TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS course_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    progress TEXT DEFAULT '[]',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS book_covers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data BLOB NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

async function initializeDatabase() {
  await db.executeMultiple(SCHEMA);
  await migrate();
  // Использует db.execute напрямую (не get/run), чтобы не звать ensureInitialized()
  // рекурсивно, пока сам initialized ещё не разрешился.
  await ensureAdminUserInternal();
}

// Лёгкая миграция для уже существующих баз
async function migrate() {
  await db.execute('PRAGMA foreign_keys = ON');

  const res = await db.execute('PRAGMA table_info(users)');
  const userColumns = res.rows as unknown as { name: string }[];
  if (!userColumns.some((c) => c.name === 'role')) {
    await db.execute(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
  }

  // Убираем дубликаты покупок курса, которые могли появиться до введения
  // уникального индекса (иначе его создание ниже завершится ошибкой).
  await db.execute(`
    DELETE FROM course_purchases
    WHERE id NOT IN (
      SELECT MIN(id) FROM course_purchases GROUP BY user_id, course_id
    )
  `);
  await db.execute(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_course_purchases_user_course ON course_purchases(user_id, course_id)'
  );
}

// Ленивая инициализация схемы: выполняется один раз на инстанс функции
let initialized: Promise<void> | null = null;

export function ensureInitialized(): Promise<void> {
  if (!initialized) {
    initialized = initializeDatabase().catch((err) => {
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
  const res = await db.execute({ sql, args });
  return res.rows as unknown as T[];
}

// SELECT одной строки (undefined, если ничего нет)
export async function get<T = Row>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  await ensureInitialized();
  const res = await db.execute({ sql, args });
  return res.rows[0] as unknown as T | undefined;
}

// INSERT / UPDATE / DELETE
export async function run(sql: string, args: InValue[] = []): Promise<RunResult> {
  await ensureInitialized();
  const res = await db.execute({ sql, args });
  return {
    changes: res.rowsAffected,
    lastInsertRowid: res.lastInsertRowid == null ? 0 : Number(res.lastInsertRowid),
  };
}

// Создаёт админа из переменных окружения, если его ещё нет.
// Вызывается из initializeDatabase() при старте, поэтому обращается к db напрямую.
async function ensureAdminUserInternal(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@ozoda.app').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return;

  const existingRes = await db.execute({
    sql: 'SELECT id FROM users WHERE role = ?',
    args: ['admin'],
  });
  if (existingRes.rows.length > 0) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await db.execute({
    sql: 'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
    args: [email, passwordHash, 'Admin', 'admin'],
  });
}

// Публичная обёртка для вызова вне initializeDatabase() (например, из /api/admin/login).
export async function ensureAdminUser(): Promise<void> {
  await ensureInitialized();
  await ensureAdminUserInternal();
}

export { LibsqlError };
export default db;
