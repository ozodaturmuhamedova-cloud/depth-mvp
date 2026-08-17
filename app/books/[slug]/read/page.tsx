'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/Button'
import { useFetch } from '@/lib/hooks/useFetch'
import type { ApiError } from '@/lib/types'

interface Chapter {
  title: string
  content: string
}

interface ReadResponse extends ApiError {
  content?: string
}

function parseChapters(content: string): Chapter[] {
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

function restoreChapter(slug: string): number {
  if (typeof window === 'undefined') return 0
  try {
    const saved = localStorage.getItem('lastBook')
    if (saved) {
      const parsed = JSON.parse(saved) as { slug?: string; chapter?: number }
      if (parsed.slug === slug) return parsed.chapter ?? 0
    }
  } catch {
    // повреждённые данные в localStorage игнорируем
  }
  return 0
}

export default function BookReaderPage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug
  const [currentChapter, setCurrentChapter] = useState(0)

  // Восстанавливаем главу из localStorage только после гидрации, чтобы
  // серверный и первый клиентский рендер совпадали. Чтение внешнего API
  // браузера (localStorage) не может быть вычислено во время рендера.
  useEffect(() => {
    if (!slug) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- значение приходит из localStorage (внешняя система), доступно только после монтирования
    setCurrentChapter(restoreChapter(slug))
  }, [slug])

  const { data, loading, error } = useFetch<ReadResponse>(
    `/api/books/${slug}/read`,
    { skip: !slug }
  )

  const chapters = data?.content ? parseChapters(data.content) : []

  const handleChapterChange = (index: number) => {
    setCurrentChapter(index)
    localStorage.setItem(`progress-${slug}`, index.toString())
    localStorage.setItem('lastBook', JSON.stringify({ slug, chapter: index }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!slug) return <ErrorState message="Не указан идентификатор книги" />
  if (loading) return <LoadingState label="Загрузка книги..." />
  if (error) return <ErrorState message={error} />

  if (chapters.length === 0) {
    return <p className="py-10 text-center text-ink-500">Книга пуста</p>
  }

  const chapter = chapters[currentChapter] ?? chapters[0]

  return (
    <div className="mx-auto max-w-3xl">
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

      <div className="sticky top-[68px] z-20 -mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-2">
        {chapters.map((ch, idx) => (
          <button
            key={idx}
            onClick={() => handleChapterChange(idx)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              idx === currentChapter
                ? 'bg-brand-600 text-white shadow-soft'
                : 'border border-ink-200 bg-white text-ink-600 hover:border-brand-400 hover:text-brand-700'
            }`}
          >
            {ch.title || `Глава ${idx + 1}`}
          </button>
        ))}
      </div>

      <article className="mt-6 rounded-card border border-ink-200 bg-white p-8 shadow-card sm:p-12">
        <h2 className="font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
          {chapter.title}
        </h2>
        <div className="prose-book mt-6">{chapter.content}</div>
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
  )
}
