'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookCard } from '@/components/BookCard'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { useFetch } from '@/lib/hooks/useFetch'
import type { BookListResponse, BookLanguage } from '@/lib/types'

type LanguageFilter = 'all' | BookLanguage

const TABS: { value: LanguageFilter; label: string; emptyLabel: string }[] = [
  { value: 'all', label: 'Все книги', emptyLabel: 'Книг пока нет' },
  { value: 'ru', label: 'Русские книги', emptyLabel: 'Русских книг пока нет' },
  { value: 'uz', label: 'Ўзбек китоблари', emptyLabel: 'Ҳозирча ўзбек тилида китоблар йўқ' },
]

function BooksCatalog() {
  const searchParams = useSearchParams()
  const initialLang = searchParams.get('lang')
  const [lang, setLang] = useState<LanguageFilter>(
    initialLang === 'ru' || initialLang === 'uz' ? initialLang : 'all'
  )
  const { data, loading, error, reload } = useFetch<BookListResponse>('/api/books')

  const books = useMemo(() => data?.books ?? [], [data])
  const counts = useMemo(
    () => ({
      all: books.length,
      ru: books.filter((b) => b.language === 'ru').length,
      uz: books.filter((b) => b.language === 'uz').length,
    }),
    [books]
  )
  const filtered = lang === 'all' ? books : books.filter((b) => b.language === lang)
  const activeTab = TABS.find((t) => t.value === lang) ?? TABS[0]

  if (loading) return <LoadingState label="Загрузка книг..." />
  if (error) return <ErrorState message={error} actionLabel="Попробовать снова" onAction={reload} />

  return (
    <div>
      <PageHeader
        kicker="Библиотека"
        title="Каталог книг"
        subtitle="Доступ ко всем книгам по подписке. Начните с бесплатного фрагмента."
      />

      <div className="mb-8 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            variant={lang === tab.value ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setLang(tab.value)}
          >
            {tab.label}
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
                lang === tab.value ? 'bg-white/20' : 'bg-ink-100 text-ink-500'
              }`}
            >
              {counts[tab.value]}
            </span>
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-300 py-20 text-center text-ink-500">
          {activeTab.emptyLabel}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BooksPage() {
  return (
    <Suspense fallback={<LoadingState label="Загрузка книг..." />}>
      <BooksCatalog />
    </Suspense>
  )
}
