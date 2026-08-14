import { all, run } from './db';

// Книги
async function main() {
  const booksCount = (await all<{ count: number }>('SELECT COUNT(*) as count FROM books'))[0]?.count ?? 0;
  if (booksCount === 0) {
    await run(
      `INSERT INTO books (slug, title, author, description, category, content, preview, cover_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'psihologiya-vliyaniya',
        'Психология влияния',
        'Роберт Чалдини',
        'Классическая книга о механизмах убеждения.',
        'Социальная психология',
        '## Глава 1. Оружие влияния\nТекст первой главы...\n\n## Глава 2. Правило взаимного обмена\nТекст второй главы...',
        '## Глава 1. Оружие влияния\nТекст первой главы...',
        'https://via.placeholder.com/300x400.png?text=Психология+влияния'
      ]
    );

    await run(
      `INSERT INTO books (slug, title, author, description, category, content, preview, cover_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'myshlenie-bystroe-i-medlennoe',
        'Мышление быстрое и медленное',
        'Даниэль Канеман',
        'О двух системах мышления.',
        'Когнитивная психология',
        '## Часть 1. Две системы\nСодержание первой части...\n\n## Часть 2. Эвристики и искажения\nСодержание второй части...',
        '## Часть 1. Две системы\nСодержание первой части...',
        'https://via.placeholder.com/300x400.png?text=Мышление'
      ]
    );

    console.log('Книги добавлены');
  }

  // Курсы
  const coursesCount = (await all<{ count: number }>('SELECT COUNT(*) as count FROM courses'))[0]?.count ?? 0;
  if (coursesCount === 0) {
    await run(
      'INSERT INTO courses (title, description, price_cents, lessons) VALUES (?, ?, ?, ?)',
      [
        'Основы когнитивно-поведенческой терапии',
        'Научитесь применять техники КПТ в повседневной жизни.',
        4999,
        JSON.stringify([
          { title: 'Введение в КПТ', content: 'Текст первого урока...' },
          { title: 'Автоматические мысли', content: 'Текст второго урока...' },
          { title: 'Работа с убеждениями', content: 'Текст третьего урока...' }
        ])
      ]
    );

    await run(
      'INSERT INTO courses (title, description, price_cents, lessons) VALUES (?, ?, ?, ?)',
      [
        'Эмоциональный интеллект',
        'Развитие навыков понимания и управления эмоциями.',
        3499,
        JSON.stringify([
          { title: 'Что такое эмоциональный интеллект?', content: 'Введение...' },
          { title: 'Осознание своих эмоций', content: 'Техники осознания...' },
          { title: 'Управление эмоциями', content: 'Методы регуляции...' }
        ])
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
