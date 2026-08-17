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
