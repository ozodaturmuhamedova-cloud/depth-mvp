import { get, run, ensureInitialized } from './db';

// Назначает администратором уже зарегистрированного пользователя.
// В системе может существовать только один admin (см. lib/db.ts,
// idx_single_admin), поэтому предыдущий админ автоматически понижается до
// обычного пользователя.
// Запуск: npm run make-admin -- user@example.com

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Использование: npm run make-admin -- user@example.com');
    process.exit(1);
  }

  await ensureInitialized();

  const user = await get<{ id: number; role: string }>('SELECT id, role FROM users WHERE email = ?', [email]);
  if (!user) {
    console.error(`Пользователь с email "${email}" не найден. Он должен сначала зарегистрироваться в приложении.`);
    process.exit(1);
  }

  if (user.role === 'admin') {
    console.log(`Пользователь ${email} уже администратор — ничего не изменилось.`);
    return;
  }

  await run(`UPDATE users SET role = 'user' WHERE role = 'admin'`);
  await run('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
  console.log(`Готово: ${email} теперь единственный администратор.`);
}

main().catch((err) => {
  console.error('Ошибка:', err);
  process.exit(1);
});
