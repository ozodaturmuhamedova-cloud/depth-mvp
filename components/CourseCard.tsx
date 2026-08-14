import type { CourseSummary } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

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
      <div className="mt-5 flex items-end justify-between gap-3 border-t border-ink-100 pt-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Цена</p>
          <p className="text-lg font-bold text-ink-900">{formatPrice(course.price_cents)}</p>
        </div>
        <ButtonLink href={`/courses/${course.id}`} variant="outline" size="sm">
          Подробнее
        </ButtonLink>
      </div>
    </div>
  )
}
