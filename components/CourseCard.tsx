import Image from 'next/image'
import type { CourseSummary } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'

const LANGUAGE_LABELS: Record<CourseSummary['language'], string> = {
  ru: 'Рус',
  uz: 'Ўзб',
}

const linkClasses =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink-800 transition-colors duration-150 hover:border-brand-500 hover:text-brand-700'

export function CourseCard({ course }: { course: CourseSummary }) {
  // next/image разрешает только локальные хосты (см. next.config.ts), внешний
  // URL уронит страницу рантайм-ошибкой — на всякий случай подстраховываемся.
  const hasCover = !!course.cover_url && course.cover_url.startsWith('/')

  return (
    <div className="group flex flex-col overflow-hidden rounded-card border border-ink-200 bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[16/10] bg-ink-100">
        {hasCover ? (
          <Image
            src={course.cover_url!}
            alt={course.title}
            fill
            sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center font-serif text-ink-400">
            {course.title}
          </div>
        )}
        <Badge variant="brand" className="absolute left-3 top-3 bg-white/90 shadow-card backdrop-blur">
          Курс
        </Badge>
        <Badge variant="neutral" className="absolute right-3 top-3 bg-white/90 shadow-card backdrop-blur">
          {LANGUAGE_LABELS[course.language]}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-serif text-xl font-bold text-ink-900">{course.title}</h2>
        {course.description && (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{course.description}</p>
        )}
        <div className="mt-5 border-t border-ink-100 pt-4">
          {course.telegram_url ? (
            <a href={course.telegram_url} target="_blank" rel="noopener noreferrer" className={linkClasses}>
              Перейти в Telegram
            </a>
          ) : (
            <span className={`${linkClasses} cursor-not-allowed opacity-50`} aria-disabled="true">
              Ссылка появится позже
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
