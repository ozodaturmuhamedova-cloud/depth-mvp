import type { CourseSummary } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'

const linkClasses =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink-800 transition-colors duration-150 hover:border-brand-500 hover:text-brand-700'

export function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <div className="flex flex-col rounded-card border border-ink-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
      <Badge variant="brand" className="self-start">
        Курс
      </Badge>
      <h2 className="mt-3 font-serif text-xl font-bold text-ink-900">{course.title}</h2>
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
  )
}
