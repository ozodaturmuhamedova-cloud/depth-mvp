import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, 'Slug может содержать только строчные латинские буквы, цифры и дефис');

export const bookSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  // Достаточно для очень крупных книг (для сравнения, «Война и мир» — около
  // 3.2 млн символов). Пока лимит ниже, загрузка больших .docx падала с
  // "Too big: expected string to have <=200000 characters".
  content: z.string().min(1).max(10_000_000, 'Текст книги слишком большой (максимум 10 млн символов)'),
  // Превью — это короткий бесплатный фрагмент на странице книги, а не вся
  // книга целиком, но лимит держим с запасом на случай ручного редактирования.
  preview: z
    .string()
    .max(20_000, 'Превью слишком длинное (максимум 20 000 символов) — оставьте только короткий фрагмент')
    .optional()
    .nullable(),
  // Только локальные файлы (/api/covers/...) — next.config.ts не разрешает
  // внешние хосты для next/image, внешний URL уронит страницу рантайм-ошибкой.
  cover_url: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === '' || v.startsWith('/'), 'Обложка должна быть локальным файлом (используйте загрузку)')
    .optional()
    .nullable(),
  content_format: z.enum(['text', 'html']).optional().default('text'),
  language: z.enum(['ru', 'uz']).optional().default('ru'),
});

const telegramUrlSchema = z
  .string()
  .trim()
  .max(300)
  .url('Некорректная ссылка')
  .refine(
    (v) => /^https:\/\/(t\.me|telegram\.me)\//i.test(v),
    'Ссылка должна вести на Telegram (https://t.me/...)'
  );

export const courseSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional().nullable(),
  telegram_url: telegramUrlSchema,
  // Только локальные файлы (/api/covers/...) — как у книг.
  cover_url: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === '' || v.startsWith('/'), 'Обложка должна быть локальным файлом (используйте загрузку)')
    .optional()
    .nullable(),
  language: z.enum(['ru', 'uz']).optional().default('ru'),
});

// Выдача/продление подписки администратором: либо готовый план (месяц/год),
// либо произвольное число дней — оба варианта считаются от текущего момента.
export const grantSubscriptionSchema = z.object({
  plan: z.enum(['month', 'year']).optional(),
  days: z.number().int().min(1).max(3650).optional(),
}).refine((v) => v.plan !== undefined || v.days !== undefined, {
  message: 'Укажите план или количество дней',
});

const localImageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === '' || v.startsWith('/'), 'Изображение должно быть локальным файлом (используйте загрузку)')
  .optional()
  .nullable();

export const siteSettingsSchema = z.object({
  // Только локальный файл (/api/covers/...) — та же причина, что и у cover_url:
  // next.config.ts не разрешает внешние хосты для next/image.
  hero_image_url: localImageUrl,
  hero_author_name: z.string().trim().max(200).optional().nullable(),
  hero_author_role: z.string().trim().max(300).optional().nullable(),
  header_portrait_url: localImageUrl,
});

const optionalTelegramUrl = z
  .string()
  .trim()
  .max(300)
  .refine(
    (v) => v === '' || /^https:\/\/(t\.me|telegram\.me)\//i.test(v),
    'Ссылка должна вести на Telegram (https://t.me/...)'
  )
  .optional()
  .nullable();

export const paymentSettingsSchema = z.object({
  payment_card_number: z.string().trim().max(40).optional().nullable(),
  payment_card_holder: z.string().trim().max(200).optional().nullable(),
  payment_telegram_url: optionalTelegramUrl,
  price_month: z.string().trim().max(40).optional().nullable(),
  price_year: z.string().trim().max(40).optional().nullable(),
});

/**
 * Вспомогательная обёртка: парсит JSON тело запроса через переданную zod-схему
 * и возвращает либо данные, либо человекочитаемое сообщение об ошибке.
 */
export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  return first?.message ?? 'Некорректные данные';
}
