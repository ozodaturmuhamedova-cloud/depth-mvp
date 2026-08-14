'use client'

import { BookCard } from '@/components/BookCard'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { useFetch } from '@/lib/hooks/useFetch'
import type { BookListResponse } from '@/lib/types'

export default function BooksPage() {
  const { data, loading, error, reload } = useFetch<BookListResponse>('/api/books')

  if (loading) return <LoadingState label="Загрузка книг..." />
  if (error) return <ErrorState message={error} actionLabel="Попробовать снова" onAction={reload} />

  const books = data?.books ?? []

  return (
    <div>
      <PageHeader
        kicker="Библиотека"
        title="Каталог книг"
        subtitle="Доступ ко всем книгам по подписке. Начните с бесплатного фрагмента."
      />
      {books.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-300 py-20 text-center text-ink-500">
          Книг пока нет
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
