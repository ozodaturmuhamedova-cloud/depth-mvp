'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/components/CourseCard'
import { useFetch } from '@/lib/hooks/useFetch'
import type { ApiError, CourseWithProgress } from '@/lib/types'

interface CourseResponse extends ApiError {
  course?: CourseWithProgress
}

export default function CourseDetailPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const { data, loading, error, reload } = useFetch<CourseResponse>(
    id ? `/api/courses/${id}` : ''
  )

  if (!id) return <ErrorState message="Не указан ID курса" />
  if (loading) return <LoadingState label="Загрузка курса..." />
  if (error) return <ErrorState message={error} />
  if (!data?.course) return <p className="py-10 text-center text-ink-500">Курс не найден</p>

  const course = data.course
  const totalLessons = course.lessons?.length ?? 0

  const handleBuy = async () => {
    const res = await fetch(`/api/courses/${id}/buy`, { method: 'POST' })
    const body = (await res.json().catch(() => null)) as ApiError | null
    if (res.ok) {
      reload()
    } else {
      alert(body?.error ?? 'Ошибка при покупке')
    }
  }

  const handleMarkLesson = async (index: number) => {
    const res = await fetch(`/api/courses/${id}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonIndex: index }),
    })
    if (res.ok) reload()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/courses"
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
        Все курсы
      </Link>

      <div className="mt-6">
        <Badge variant="brand">Курс</Badge>
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">
          {course.title}
        </h1>
        {course.description && <p className="mt-3 text-lg leading-relaxed text-ink-600">{course.description}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <span className="font-serif text-2xl font-bold text-ink-900">
            {formatPrice(course.price_cents)}
          </span>
          {!course.purchased && (
            <Button variant="accent" onClick={handleBuy}>
              Купить курс
            </Button>
          )}
        </div>
      </div>

      {course.purchased ? (
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-2xl font-bold text-ink-900">Уроки</h2>
            {course.progress.length > 0 && (
              <span className="text-sm text-ink-500">
                Пройдено {course.progress.length} из {totalLessons}
              </span>
            )}
          </div>
          {course.lessons && course.lessons.length > 0 ? (
            <ol className="space-y-3">
              {course.lessons.map((lesson, index) => {
                const completed = course.progress.includes(index)
                return (
                  <li
                    key={index}
                    className={`flex items-start justify-between gap-4 rounded-card border p-5 ${
                      completed ? 'border-success-200 bg-success-50' : 'border-ink-200 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                            completed ? 'bg-success-600 text-white' : 'bg-ink-100 text-ink-600'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <h3 className="font-semibold text-ink-900">{lesson.title}</h3>
                      </div>
                      <p className="mt-2 pl-9 text-sm leading-relaxed text-ink-600">
                        {lesson.content}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {completed ? (
                        <Badge variant="success">✓ Пройдено</Badge>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleMarkLesson(index)}
                        >
                          Отметить
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="text-ink-500">Уроки отсутствуют</p>
          )}
        </section>
      ) : (
        <section className="mt-10 rounded-card border border-dashed border-ink-300 bg-white/60 p-8 text-center">
          <p className="text-ink-600">
            Купите курс, чтобы открыть доступ к урокам и отслеживать прогресс.
          </p>
          <Button variant="accent" className="mt-4" onClick={handleBuy}>
            Купить за {formatPrice(course.price_cents)}
          </Button>
        </section>
      )}
    </div>
  )
}
