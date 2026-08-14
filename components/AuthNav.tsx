'use client'

import Link from 'next/link'
import { useFetch } from '@/lib/hooks/useFetch'
import type { ApiError } from '@/lib/types'

export function AuthNav() {
  const { data } = useFetch<{ user: unknown } & ApiError>('/api/me')
  const loggedIn = !!data?.user

  if (loggedIn) {
    return (
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
      >
        Кабинет
      </Link>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        href="/login"
        className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 transition hover:text-brand-700"
      >
        Войти
      </Link>
      <Link
        href="/register"
        className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
      >
        Начать
      </Link>
    </div>
  )
}
