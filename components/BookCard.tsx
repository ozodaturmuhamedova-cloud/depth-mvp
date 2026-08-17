import Image from 'next/image'
import Link from 'next/link'
import type { BookSummary } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'

export function BookCard({ book }: { book: BookSummary }) {
  // next/image разрешает только локальные хосты (см. next.config.ts), внешний
  // URL уронит страницу рантайм-ошибкой — на всякий случай подстраховываемся.
  const hasCover = !!book.cover_url && book.cover_url.startsWith('/')
  return (
    <div className="group flex flex-col overflow-hidden rounded-card border border-ink-200 bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[3/4] bg-ink-100">
        {hasCover ? (
          <Image
            src={book.cover_url!}
            alt={book.title}
            fill
            sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center font-serif text-ink-400">
            {book.title}
          </div>
        )}
        {book.category && (
          <Badge variant="brand" className="absolute left-3 top-3 bg-white/90 shadow-card backdrop-blur">
            {book.category}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-serif text-lg font-bold leading-snug text-ink-900">{book.title}</h2>
        {book.author && <p className="mt-0.5 text-sm text-ink-500">{book.author}</p>}
        {book.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">
            {book.description}
          </p>
        )}
        <Link
          href={`/books/${book.slug}`}
          className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-brand-600 transition group-hover:gap-2.5 group-hover:text-brand-700"
        >
          Читать
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 8h10m0 0-3.5-3.5M13 8 9.5 11.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </div>
  )
}
