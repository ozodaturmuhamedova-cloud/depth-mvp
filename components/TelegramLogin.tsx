'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

function safeNextPath(value: string | null): string {
  if (!value) return '/dashboard'
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

interface TelegramLoginProps {
  onError: (message: string) => void
}

export function TelegramLogin({ onError }: TelegramLoginProps) {
  const searchParams = useSearchParams()
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      onErrorRef.current(error)
    }
  }, [searchParams])

  const next = safeNextPath(searchParams.get('next'))
  const startUrl = `/api/auth/telegram/start?next=${encodeURIComponent(next)}`

  return (
    <div className="flex flex-col items-center gap-3">
      <a
        href={startUrl}
        className="inline-flex h-11 min-w-[240px] items-center justify-center gap-2 rounded-lg bg-[#54a9eb] px-5 text-sm font-semibold text-white transition hover:bg-[#4b9ade]"
      >
        Войти через Telegram
      </a>
      <p className="text-center text-xs leading-relaxed text-ink-500">
        После подтверждения в Telegram вы автоматически войдёте в аккаунт
      </p>
    </div>
  )
}
