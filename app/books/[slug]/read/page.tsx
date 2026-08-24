'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChapterDrawer } from '@/components/reader/ChapterDrawer'
import { ChapterSidebar } from '@/components/reader/ChapterSidebar'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/Button'
import { useFetch } from '@/lib/hooks/useFetch'
import { loadReadingProgress, useReadingProgress } from '@/lib/hooks/useReadingProgress'
import { parseTextChapters, splitHtmlChapters } from '@/lib/chapters'
import type { ApiError, ContentFormat } from '@/lib/types'

interface ReadResponse extends ApiError {
  content?: string
  format?: ContentFormat
}

// HTML приходит уже санитизированным на сервере (см. lib/docx.ts, применяется
// повторно при каждом сохранении книги в /api/admin/books) и создаётся только
// администратором — dangerouslySetInnerHTML здесь безопасен.
interface DisplayChapter {
  title: string
  content?: string
  html?: string
}

function buildChapters(content: string, format: ContentFormat): DisplayChapter[] {
  if (format === 'html') {
    return splitHtmlChapters(content).map((ch) => ({ title: ch.title, html: ch.html }))
  }
  return parseTextChapters(content).map((ch) => ({ title: ch.title, content: ch.content }))
}

// Приоритет источника начальной главы: валидный ?chapter= из URL (чтобы
// ссылку на конкретную главу можно было скопировать и открыть заново),
// затем сохранённый прогресс из localStorage, иначе первая глава.
function resolveInitialChapter(slug: string, chaptersLength: number, chapterParam: string | null): number {
  const fromUrl = chapterParam ? Number(chapterParam) : NaN
  if (Number.isInteger(fromUrl) && fromUrl >= 1 && fromUrl <= chaptersLength) {
    return fromUrl - 1
  }
  const stored = loadReadingProgress(slug)
  if (stored && stored.chapter >= 0 && stored.chapter < chaptersLength) {
    return stored.chapter
  }
  return 0
}

function ReaderContent() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, loading, error } = useFetch<ReadResponse>(
    `/api/books/${slug}/read`,
    { skip: !slug }
  )

  const chapters = data?.content ? buildChapters(data.content, data.format ?? 'text') : []

  const { currentChapter, visited, initialized, goToChapter, initFromChapter } = useReadingProgress(slug)

  // Главы известны только после загрузки контента — разрешаем начальную
  // главу (URL/localStorage) один раз, как только длина глав становится известной.
  useEffect(() => {
    if (!slug || chapters.length === 0 || initialized) return
    const index = resolveInitialChapter(slug, chapters.length, searchParams.get('chapter'))
    initFromChapter(index)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- разрешаем один раз через initialized, searchParams/initFromChapter намеренно не отслеживаем
  }, [slug, chapters.length, initialized])

  const handleChapterChange = useCallback(
    (index: number) => {
      goToChapter(index)
      router.replace(`${pathname}?chapter=${index + 1}`, { scroll: false })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [goToChapter, router, pathname]
  )

  // Быстрая навигация по главам со стрелок клавиатуры + блокировка
  // горячих клавиш копирования/сохранения/печати текста книги.
  useEffect(() => {
    if (!initialized || chapters.length === 0) return

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isEditable = target && ['INPUT', 'TEXTAREA'].includes(target.tagName)

      // Блокируем копирование, сохранение страницы и печать (текст книги —
      // платный контент). Работает только против случайного/неопытного
      // копирования — полноценной защиты от копирования в браузере не существует.
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && ['c', 's', 'p', 'u'].includes(key)) {
        e.preventDefault()
        return
      }

      if (isEditable) return

      if (e.key === 'ArrowRight' && currentChapter < chapters.length - 1) {
        handleChapterChange(currentChapter + 1)
      } else if (e.key === 'ArrowLeft' && currentChapter > 0) {
        handleChapterChange(currentChapter - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [initialized, chapters.length, currentChapter, handleChapterChange])

  if (!slug) return <ErrorState message="Не указан идентификатор книги" />
  if (loading) return <LoadingState label="Загрузка книги..." />
  if (error) return <ErrorState message={error} />

  if (chapters.length === 0) {
    return <p className="py-10 text-center text-ink-500">Книга пуста</p>
  }

  const chapter = chapters[currentChapter] ?? chapters[0]

  return (
    <div className="mx-auto max-w-5xl lg:flex lg:items-start lg:gap-8">
      <ChapterSidebar
        chapters={chapters}
        currentIndex={currentChapter}
        visited={visited}
        onSelect={handleChapterChange}
      />

      <ChapterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chapters={chapters}
        currentIndex={currentChapter}
        visited={visited}
        onSelect={handleChapterChange}
      />

      <div className="min-w-0 flex-1 lg:max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/books/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-brand-600"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M13 8H3m0 0 3.5-3.5M3 8l3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            О книге
          </Link>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 shadow-card transition hover:border-brand-400 hover:text-brand-700 lg:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Оглавление
          </button>
        </div>

        <article
          className="no-copy no-print mt-6 rounded-card border border-ink-200 bg-white p-8 shadow-card sm:p-12"
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          <h2 className="font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
            {chapter.title}
          </h2>
          {chapter.html !== undefined ? (
            <div
              className="prose-book-html mt-6"
              dangerouslySetInnerHTML={{ __html: chapter.html }}
            />
          ) : (
            <div className="prose-book mt-6">{chapter.content}</div>
          )}
        </article>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={currentChapter === 0}
            onClick={() => handleChapterChange(currentChapter - 1)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M13 8H3m0 0 3.5-3.5M3 8l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Предыдущая
          </Button>
          <span className="text-sm text-ink-500">
            Глава {currentChapter + 1} из {chapters.length}
          </span>
          <Button
            variant="outline"
            disabled={currentChapter === chapters.length - 1}
            onClick={() => handleChapterChange(currentChapter + 1)}
          >
            Следующая
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10m0 0-3.5-3.5M13 8 9.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function BookReaderPage() {
  return (
    // useSearchParams (для ?chapter=) требует границы Suspense в App Router.
    <Suspense fallback={<LoadingState label="Загрузка книги..." />}>
      <ReaderContent />
    </Suspense>
  )
}
