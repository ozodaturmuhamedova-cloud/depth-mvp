// Чистые функции без серверных зависимостей — используются и на сервере
// (lib/docx.ts), и в клиентском компоненте читалки (app/books/[slug]/read).

export interface Chapter {
  title: string
  content: string
}

export interface HtmlChapter {
  title: string
  html: string
}

// Текстовые книги режутся по "## " — исходный формат, использовавшийся
// до появления HTML-импорта из .docx.
export function parseTextChapters(content: string): Chapter[] {
  return content
    .split(/^## /m)
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.trim().split('\n')
      return {
        title: lines[0].replace(/^##\s*/, ''),
        content: lines.slice(1).join('\n').trim(),
      }
    })
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, '')
}

// HTML-книги (импортированные из .docx) режутся по тегам <h2>.
export function splitHtmlChapters(html: string): HtmlChapter[] {
  const parts = html.split(/(?=<h2[^>]*>)/i).filter((part) => part.trim())

  if (parts.length === 0) {
    return html.trim() ? [{ title: '', html }] : []
  }

  return parts.map((part) => {
    const match = part.match(/^<h2[^>]*>(.*?)<\/h2>([\s\S]*)$/i)
    if (!match) {
      return { title: '', html: part }
    }
    return { title: stripTags(match[1]).trim(), html: match[2] }
  })
}

// Дефолтный размер бесплатного фрагмента книги, автоматически заполняемого
// при импорте .docx. Без этого лимита превью для книги без разбивки на главы
// (или с одной огромной первой главой) получалось размером во всю книгу и
// падало на серверной валидации (max(20_000) в lib/validation.ts).
const DEFAULT_PREVIEW_MAX_CHARS = 4000

// Обрезает HTML по границам блочных элементов (параграфы, заголовки, списки
// и т.д.), а не посимвольно — иначе можно оборвать тег и сломать разметку.
export function truncateHtmlPreview(html: string, maxChars = DEFAULT_PREVIEW_MAX_CHARS): string {
  if (html.length <= maxChars) return html

  const blocks = html.match(/<(p|h2|h3|h4|ul|ol|blockquote|table)[^>]*>[\s\S]*?<\/\1>|<hr\s*\/?>/gi)
  if (!blocks || blocks.length === 0) return html.slice(0, maxChars)

  let result = ''
  for (const block of blocks) {
    if (result && result.length + block.length > maxChars) break
    result += block
  }
  return result || blocks[0]
}
