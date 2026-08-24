import 'server-only';
import mammoth from 'mammoth';
import sanitizeHtml from 'sanitize-html';
import { splitHtmlChapters } from '@/lib/chapters';

export interface DocxImportResult {
  html: string;
  chaptersCount: number;
  title: string | null;
}

// Разрешённые теги и атрибуты для книжного контента. Никаких img/script/style/
// iframe/on*-обработчиков — импортированный .docx мог быть подготовлен кем угодно.
const ALLOWED_TAGS = [
  'h2', 'h3', 'h4',
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's',
  'ul', 'ol', 'li',
  'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'sup', 'sub',
  'code', 'pre',
  'a',
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'rel', 'target'],
};

const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

export function sanitizeBookHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
      // mammoth иногда выдаёт h1 для заголовка документа — приравниваем к h2 главы
      h1: 'h2',
    },
    // Убираем пустые параграфы, оставшиеся после чистки картинок и стилей
    exclusiveFilter: (frame) => frame.tag === 'p' && !frame.text.trim(),
  });
}

// Mammoth сопоставляет стили по точному названию, которое показывает сам
// Word — оно зависит от языка интерфейса (например, «Heading 1» в английской
// версии и «Заголовок 1» в русской). Перечисляем оба варианта, чтобы импорт
// не зависел от локализации Word, в котором готовился документ.
const HEADING_STYLE_MAP = [
  "p[style-name='Title'] => h2:fresh",
  "p[style-name='Название'] => h2:fresh",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Заголовок 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h3:fresh",
  "p[style-name='Заголовок 2'] => h3:fresh",
  "p[style-name='Heading 3'] => h4:fresh",
  "p[style-name='Заголовок 3'] => h4:fresh",
];

/**
 * Конвертирует .docx в санитизированный HTML. Изображения намеренно
 * отбрасываются: mammoth по умолчанию встраивает их как base64, что
 * многократно раздувает объём хранимого контента и не входит в объём задачи.
 */
export async function convertDocxToHtml(buffer: Buffer): Promise<DocxImportResult> {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: HEADING_STYLE_MAP,
      convertImage: mammoth.images.imgElement(async () => ({ src: '' })),
    }
  );

  const withoutImages = result.value.replace(/<img[^>]*>/gi, '');
  const html = sanitizeBookHtml(withoutImages);

  const chapters = splitHtmlChapters(html);
  const firstHeadingMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
  const title = firstHeadingMatch ? stripTags(firstHeadingMatch[1]).trim() || null : null;

  return { html, chaptersCount: chapters.length || 1, title };
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, '');
}
