'use client'

import { useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/LoadingState'
import { useFetch } from '@/lib/hooks/useFetch'
import type { ApiError, User } from '@/lib/types'

interface MeResponse extends ApiError {
  user?: User
}

interface SubscriptionInfo {
  plan: string
  active_until: string
}

interface SubResponse extends ApiError {
  subscription: SubscriptionInfo | null
}

interface PurchasedCourse {
  id: number
  title: string
  progress: number[]
}

interface CoursesResponse extends ApiError {
  courses: PurchasedCourse[]
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function parseLastBook(raw: string | null): { slug: string; chapter: number } | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as { slug: string; chapter: number }
  } catch {
    return null
  }
}

const planLabel = (plan: string) => (plan === 'month' ? 'Месяц' : 'Год')

export default function DashboardPage() {
  const router = useRouter()
  const me = useFetch<MeResponse>('/api/me')
  const subscription = useFetch<SubResponse>('/api/me/subscription')
  const courses = useFetch<CoursesResponse>('/api/me/courses')

  const lastBookRaw = useSyncExternalStore(
    subscribeToStorage,
    () => localStorage.getItem('lastBook'),
    () => null
  )
  const lastBook = parseLastBook(lastBookRaw)

  useEffect(() => {
    if (me.error) router.push('/login')
  }, [me.error, router])

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/')
  }

  if (me.loading || subscription.loading || courses.loading) {
    return <LoadingState label="Загрузка личного кабинета..." />
  }

  const user = me.data?.user
  if (!user) return <p className="py-10 text-center text-ink-500">Пользователь не найден</p>

  const sub = subscription.data?.subscription ?? null
  const myCourses = courses.data?.courses ?? []

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="kicker mb-1">Личный кабинет</p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink-900">
            {user.name ? `Здравствуйте, ${user.name}` : 'Здравствуйте'}
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-danger-500 hover:text-danger-600"
        >
          Выйти
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-bold text-ink-900">Подписка</h2>
            {sub ? <Badge variant="success">Активна</Badge> : <Badge variant="danger">Нет</Badge>}
          </div>
          {sub ? (
            <div className="mt-4">
              <p className="text-ink-700">
                План: <strong>{planLabel(sub.plan)}</strong>
              </p>
              <p className="mt-1 text-sm text-ink-500">
                Действует до {new Date(sub.active_until).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-ink-600">Подписка даёт доступ ко всем книгам.</p>
              <ButtonLink href="/pricing" variant="primary" className="mt-4">
                Оформить подписку
              </ButtonLink>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-bold text-ink-900">Продолжить чтение</h2>
            {lastBook && <Badge variant="brand">Глава {lastBook.chapter + 1}</Badge>}
          </div>
          {lastBook ? (
            <div className="mt-4">
              <ButtonLink href={`/books/${lastBook.slug}/read`} variant="outline">
                Продолжить чтение
              </ButtonLink>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-500">Нет недавних книг</p>
          )}
        </Card>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-serif text-2xl font-bold text-ink-900">Мои курсы</h2>
          {myCourses.length > 0 && (
            <span className="text-sm text-ink-500">
              {myCourses.length} {myCourses.length === 1 ? 'курс' : myCourses.length < 5 ? 'курса' : 'курсов'}
            </span>
          )}
        </div>
        {myCourses.length > 0 ? (
          <div className="space-y-3">
            {myCourses.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-ink-200 bg-white p-5 shadow-card"
              >
                <div>
                  <h3 className="font-semibold text-ink-900">{c.title}</h3>
                  <p className="mt-0.5 text-sm text-ink-500">
                    Пройдено уроков: {c.progress.length}
                  </p>
                </div>
                <Link
                  href={`/courses/${c.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
                >
                  Перейти
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
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-ink-300 py-16 text-center">
            <p className="text-ink-600">Вы ещё не купили ни одного курса.</p>
            <ButtonLink href="/courses" variant="outline" className="mt-4">
              Смотреть курсы
            </ButtonLink>
          </div>
        )}
      </section>
    </div>
  )
}
