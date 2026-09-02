import 'server-only';
import { get, run } from '@/lib/db';
import type { TelegramAuthData } from '@/lib/validation';
import { buildTelegramDisplayName, getTelegramAdminId } from '@/lib/telegram-auth';

interface TelegramUser {
  id: number;
  role: string;
}

// Ищет существующего пользователя по telegram_id или привязывает Telegram
// к ранее созданному аккаунту (по username или legacy admin без telegram_id).
export async function findOrLinkTelegramUser(
  data: TelegramAuthData
): Promise<{ user: TelegramUser; linked: boolean }> {
  const displayName = buildTelegramDisplayName(data);
  const telegramUsername = data.username ?? null;
  const shouldBeAdmin = getTelegramAdminId() !== null && data.id === getTelegramAdminId();

  const byTelegramId = await get<TelegramUser>(
    'SELECT id, role FROM users WHERE telegram_id = ?',
    [data.id]
  );
  if (byTelegramId) {
    await run(
      `UPDATE users SET name = ?, telegram_username = ?, last_login_at = datetime('now') WHERE id = ?`,
      [displayName, telegramUsername, byTelegramId.id]
    );
    await promoteAdminIfNeeded(byTelegramId, shouldBeAdmin);
    return { user: byTelegramId, linked: false };
  }

  if (telegramUsername) {
    const byUsername = await get<TelegramUser & { telegram_id: number | null }>(
      `SELECT id, role, telegram_id FROM users WHERE LOWER(telegram_username) = LOWER(?)`,
      [telegramUsername]
    );
    if (byUsername) {
      if (byUsername.telegram_id != null && byUsername.telegram_id !== data.id) {
        throw new Error('TELEGRAM_USERNAME_CONFLICT');
      }
      await run(
        `UPDATE users SET telegram_id = ?, telegram_username = ?, name = ?, last_login_at = datetime('now') WHERE id = ?`,
        [data.id, telegramUsername, displayName, byUsername.id]
      );
      const user = { id: byUsername.id, role: byUsername.role };
      await promoteAdminIfNeeded(user, shouldBeAdmin);
      return { user, linked: true };
    }
  }

  if (shouldBeAdmin) {
    const legacyAdmin = await get<TelegramUser>(
      `SELECT id, role FROM users WHERE role = 'admin' AND telegram_id IS NULL LIMIT 1`
    );
    if (legacyAdmin) {
      await run(
        `UPDATE users SET telegram_id = ?, telegram_username = ?, name = ?, last_login_at = datetime('now') WHERE id = ?`,
        [data.id, telegramUsername, displayName, legacyAdmin.id]
      );
      return { user: legacyAdmin, linked: true };
    }
  }

  const role = shouldBeAdmin ? 'admin' : 'user';
  if (shouldBeAdmin) {
    await run(`UPDATE users SET role = 'user' WHERE role = 'admin'`);
  }

  const result = await run(
    `INSERT INTO users (telegram_id, telegram_username, name, role, last_login_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [data.id, telegramUsername, displayName, role]
  );

  return { user: { id: result.lastInsertRowid, role }, linked: false };
}

async function promoteAdminIfNeeded(user: TelegramUser, shouldBeAdmin: boolean): Promise<void> {
  if (!shouldBeAdmin || user.role === 'admin') return;
  await run(`UPDATE users SET role = 'user' WHERE role = 'admin'`);
  await run('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
  user.role = 'admin';
}
