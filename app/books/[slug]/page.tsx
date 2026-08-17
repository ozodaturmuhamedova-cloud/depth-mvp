'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useFetch } from '@/lib/hooks/useFetch'
import type { ApiError } from '@/lib/types'

interface BookDetailResponse extends ApiError {
  book?: {
    id: number
    slug: string
    title: string
    author: string | null
    description: string | null
    preview: string | null
    cover_url: string | null
    category: string | null
  }
}

function renderPreview(preview: string) {
  return preview.split('\n').map((line, i) => {
    const match = line.match(/^#{2,3}\s+(.*)$/)
    if (match) {
      return <h3 key={i}>{match[1]}</h3>
    }
    return line.trim() ? <p key={i}>{line}</p> : null
  })
}

export default function BookDetailPage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug
  const router = useRouter()

  const { data, loading, error } = useFetch<BookDetailResponse>(
    `/api/books/${slug}`,
    { skip: !slug }
  )

  if (!slug) return <ErrorState message="Не указан идентификатор книги" />
  if (loading) return <LoadingState label="Загрузка..." />
  if (error) return <ErrorState message={error} actionLabel="Вернуться назад" onAction={() => router.back()} />

  const book = data?.book
  if (!book) return <p className="py-10 text-center text-ink-500">Книга не найдена</p>

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/books"
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
        К каталогу книг
      </Link>

      <div className="mt-6 grid gap-8 sm:grid-cols-[minmax(0,230px)_1fr]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-card bg-ink-100 shadow-lift">
          {book.cover_url && (
            <Image src={book.cover_url} alt={book.title} fill className="object-cover" />
          )}
        </div>
        <div className="flex flex-col">
          {book.category && <Badge variant="brand" className="self-start">{book.category}</Badge>}
          <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">
            {book.title}
          </h1>
          {book.author && <p className="mt-2 text-ink-500">{book.author}</p>}
          <div className="mt-6">
            <Button size="lg" onClick={() => router.push(`/books/${slug}/read`)}>
              Читать книгу
            </Button>
          </div>
        </div>
      </div>

      {book.description && (
        <section className="mt-10">
          <h2 className="kicker mb-3">О книге</h2>
          <p className="leading-relaxed text-ink-700">{book.description}</p>
        </section>
      )}

      {book.preview && (
        <section className="mt-10">
          <h2 className="kicker mb-3">Бесплатный фрагмент</h2>
          <div className="prose-book rounded-card border border-ink-200 bg-white p-6 shadow-card sm:p-8">
            {renderPreview(book.preview)}
          </div>
        </section>
      )}
    </div>
  )
}
