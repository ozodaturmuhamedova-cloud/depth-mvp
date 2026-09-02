'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { notifyAuthChanged } from '@/lib/auth-events'
import type { ApiError } from '@/lib/types'

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void
  }
}

function safeNextPath(value: string | null): string {
  if (!value) return '/dashboard'
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

interface TelegramLoginProps {
  onError: (message: string) => void
}

export function TelegramLogin({ onError }: TelegramLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

  useEffect(() => {
    if (!botUsername || !containerRef.current) return

    const container = containerRef.current

    window.onTelegramAuth = async (user) => {
      setLoading(true)
      onError('')

      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        })
        const data = (await res.json()) as ApiError

        if (!res.ok) {
          onError(data.error ?? 'Ошибка входа через Telegram')
          return
        }

        notifyAuthChanged()
        router.push(safeNextPath(searchParams.get('next')))
        router.refresh()
      } catch {
        onError('Сетевая ошибка')
      } finally {
        setLoading(false)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    container.appendChild(script)

    return () => {
      delete window.onTelegramAuth
      container.innerHTML = ''
    }
  }, [botUsername, onError, router, searchParams])

  if (!botUsername) {
    return (
      <p className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-center text-sm text-danger-600">
        Telegram-бот не настроен. Задайте NEXT_PUBLIC_TELEGRAM_BOT_USERNAME в переменных окружения.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={containerRef} className="flex justify-center" />
      {loading && <p className="text-sm text-ink-500">Вход...</p>}
    </div>
  )
}
