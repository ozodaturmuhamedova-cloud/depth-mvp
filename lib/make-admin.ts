import { get, run, ensureInitialized } from './db';

// Назначает администратором уже зарегистрированного пользователя.
// В системе может существовать только один admin (см. lib/db.ts,
// idx_single_admin), поэтому предыдущий админ автоматически понижается до
// обычного пользователя.
// Запуск: npm run make-admin -- 123456789

async function main() {
  const raw = process.argv[2]?.trim();
  if (!raw) {
    console.error('Использование: npm run make-admin -- <telegram_id>');
    process.exit(1);
  }

  const telegramId = Number(raw);
  if (!Number.isInteger(telegramId) || telegramId <= 0) {
    console.error('Telegram ID должен быть положительным целым числом');
    process.exit(1);
  }

  await ensureInitialized();

  const user = await get<{ id: number; role: string; telegram_username: string | null }>(
    'SELECT id, role, telegram_username FROM users WHERE telegram_id = ?',
    [telegramId]
  );
  if (!user) {
    console.error(
      `Пользователь с Telegram ID ${telegramId} не найден. Он должен сначала войти в приложение.`
    );
    process.exit(1);
  }

  const label = user.telegram_username ? `@${user.telegram_username}` : String(telegramId);

  if (user.role === 'admin') {
    console.log(`Пользователь ${label} уже администратор — ничего не изменилось.`);
    return;
  }

  await run(`UPDATE users SET role = 'user' WHERE role = 'admin'`);
  await run('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
  console.log(`Готово: ${label} теперь единственный администратор.`);
}

main().catch((err) => {
  console.error('Ошибка:', err);
  process.exit(1);
});
