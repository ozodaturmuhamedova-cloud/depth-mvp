'use client'

import { CourseCard } from '@/components/CourseCard'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { useFetch } from '@/lib/hooks/useFetch'
import type { CourseListResponse } from '@/lib/types'

export default function CoursesPage() {
  const { data, loading, error, reload } = useFetch<CourseListResponse>('/api/courses')

  if (loading) return <LoadingState label="Загрузка курсов..." />
  if (error) return <ErrorState message={error} actionLabel="Попробовать снова" onAction={reload} />

  const courses = data?.courses ?? []

  return (
    <div>
      <PageHeader
        kicker="Обучение"
        title="Курсы"
        subtitle="Практические программы с отслеживанием прогресса"
      />
      {courses.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-300 py-20 text-center text-ink-500">
          Курсов пока нет
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}
