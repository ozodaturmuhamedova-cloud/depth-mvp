import 'server-only';
import { get, run } from '@/lib/db';
import { getTelegramAdminId } from '@/lib/telegram-auth';
import type { TelegramOidcClaims } from '@/lib/telegram-oidc';

interface TelegramUser {
  id: number;
  role: string;
}

// Ищет существующего пользователя по telegram_id или привязывает Telegram
// к ранее созданному аккаунту (по username или legacy admin без telegram_id).
export async function findOrLinkTelegramUser(
  data: TelegramOidcClaims
): Promise<{ user: TelegramUser; linked: boolean }> {
  const displayName = data.name;
  const telegramUsername = data.username;
  const telegramId = data.telegramId;
  const shouldBeAdmin = getTelegramAdminId() !== null && telegramId === getTelegramAdminId();

  const byTelegramId = await get<TelegramUser>(
    'SELECT id, role FROM users WHERE telegram_id = ?',
    [telegramId]
  );
  if (byTelegramId) {
    await run(
      `UPDATE users SET name = ?, telegram_username = ?, last_login_at = datetime('now') WHERE id = ?`,
      [displayName, telegramUsername, byTelegramId.id]
    );
    await promoteAdminIfNeeded(byTelegramId, shouldBeAdmin);
    return { user: { id: Number(byTelegramId.id), role: byTelegramId.role }, linked: false };
  }

  if (telegramUsername) {
    const byUsername = await get<TelegramUser & { telegram_id: number | null }>(
      `SELECT id, role, telegram_id FROM users WHERE LOWER(telegram_username) = LOWER(?)`,
      [telegramUsername]
    );
    if (byUsername) {
      if (byUsername.telegram_id != null && byUsername.telegram_id !== telegramId) {
        throw new Error('TELEGRAM_USERNAME_CONFLICT');
      }
      await run(
        `UPDATE users SET telegram_id = ?, telegram_username = ?, name = ?, last_login_at = datetime('now') WHERE id = ?`,
        [telegramId, telegramUsername, displayName, byUsername.id]
      );
      const user = { id: Number(byUsername.id), role: byUsername.role };
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
        [telegramId, telegramUsername, displayName, legacyAdmin.id]
      );
      return { user: { id: Number(legacyAdmin.id), role: legacyAdmin.role }, linked: true };
    }
  }

  const role = shouldBeAdmin ? 'admin' : 'user';
  if (shouldBeAdmin) {
    await run(`UPDATE users SET role = 'user' WHERE role = 'admin'`);
  }

  const result = await run(
    `INSERT INTO users (telegram_id, telegram_username, name, role, last_login_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [telegramId, telegramUsername, displayName, role]
  );

  return { user: { id: Number(result.lastInsertRowid), role }, linked: false };
}

async function promoteAdminIfNeeded(user: TelegramUser, shouldBeAdmin: boolean): Promise<void> {
  if (!shouldBeAdmin || user.role === 'admin') return;
  await run(`UPDATE users SET role = 'user' WHERE role = 'admin'`);
  await run('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
  user.role = 'admin';
}
