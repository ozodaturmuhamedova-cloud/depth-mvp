'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CourseCard } from '@/components/CourseCard'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { useFetch } from '@/lib/hooks/useFetch'
import type { CourseListResponse, BookLanguage } from '@/lib/types'

type LanguageFilter = 'all' | BookLanguage

const TABS: { value: LanguageFilter; label: string; emptyLabel: string }[] = [
  { value: 'all', label: 'Все курсы', emptyLabel: 'Курсов пока нет' },
  { value: 'ru', label: 'Русские курсы', emptyLabel: 'Русских курсов пока нет' },
  { value: 'uz', label: 'Ўзбек курслари', emptyLabel: 'Ҳозирча ўзбек тилида курслар йўқ' },
]

function CoursesCatalog() {
  const searchParams = useSearchParams()
  const initialLang = searchParams.get('lang')
  const [lang, setLang] = useState<LanguageFilter>(
    initialLang === 'ru' || initialLang === 'uz' ? initialLang : 'all'
  )
  const { data, loading, error, reload } = useFetch<CourseListResponse>('/api/courses')

  const courses = useMemo(() => data?.courses ?? [], [data])
  const counts = useMemo(
    () => ({
      all: courses.length,
      ru: courses.filter((c) => c.language === 'ru').length,
      uz: courses.filter((c) => c.language === 'uz').length,
    }),
    [courses]
  )
  const filtered = lang === 'all' ? courses : courses.filter((c) => c.language === lang)
  const activeTab = TABS.find((t) => t.value === lang) ?? TABS[0]

  if (loading) return <LoadingState label="Загрузка курсов..." />
  if (error) return <ErrorState message={error} actionLabel="Попробовать снова" onAction={reload} />

  return (
    <div>
      <PageHeader
        kicker="Обучение"
        title="Курсы"
        subtitle="Практические программы — подробности и материалы в Telegram-канале"
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CoursesPage() {
  return (
    <Suspense fallback={<LoadingState label="Загрузка курсов..." />}>
      <CoursesCatalog />
    </Suspense>
  )
}
