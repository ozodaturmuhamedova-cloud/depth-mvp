import { all, run } from './db';

// Книги
async function main() {
  const booksCount = (await all<{ count: number }>('SELECT COUNT(*) as count FROM books'))[0]?.count ?? 0;
  if (booksCount === 0) {
    await run(
      `INSERT INTO books (slug, title, author, description, category, content, preview, cover_url, language)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'psihologiya-vliyaniya',
        'Психология влияния',
        'Роберт Чалдини',
        'Классическая книга о механизмах убеждения.',
        'Социальная психология',
        '## Глава 1. Оружие влияния\nТекст первой главы...\n\n## Глава 2. Правило взаимного обмена\nТекст второй главы...',
        '## Глава 1. Оружие влияния\nТекст первой главы...',
        // Внешние плейсхолдеры больше не используются — next.config.ts сужает
        // remotePatterns, обложки загружаются через /api/admin/covers.
        null,
        'ru'
      ]
    );

    await run(
      `INSERT INTO books (slug, title, author, description, category, content, preview, cover_url, language)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'myshlenie-bystroe-i-medlennoe',
        'Мышление быстрое и медленное',
        'Даниэль Канеман',
        'О двух системах мышления.',
        'Когнитивная психология',
        '## Часть 1. Две системы\nСодержание первой части...\n\n## Часть 2. Эвристики и искажения\nСодержание второй части...',
        '## Часть 1. Две системы\nСодержание первой части...',
        null,
        'ru'
      ]
    );

    console.log('Книги добавлены');
  }

  // Курсы — теперь без цены и уроков, только описание и ссылка на Telegram-канал.
  const coursesCount = (await all<{ count: number }>('SELECT COUNT(*) as count FROM courses'))[0]?.count ?? 0;
  if (coursesCount === 0) {
    await run(
      'INSERT INTO courses (title, description, telegram_url) VALUES (?, ?, ?)',
      [
        'Основы когнитивно-поведенческой терапии',
        'Научитесь применять техники КПТ в повседневной жизни.',
        'https://t.me/ozoda_kpt',
      ]
    );

    await run(
      'INSERT INTO courses (title, description, telegram_url) VALUES (?, ?, ?)',
      [
        'Эмоциональный интеллект',
        'Развитие навыков понимания и управления эмоциями.',
        'https://t.me/ozoda_ei',
      ]
    );

    console.log('Курсы добавлены');
  }

  console.log('Seed завершён');
}

main().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
