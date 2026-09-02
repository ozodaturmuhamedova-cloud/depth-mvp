'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { notifyAuthChanged } from '@/lib/auth-events'
import type { ApiError } from '@/lib/types'

function safeNextPath(value: string | null): string {
  if (!value) return '/dashboard'
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

function normalizeBotUsername(value: string | undefined): string | null {
  if (!value) return null
  const username = value.trim().replace(/^@/, '')
  return username || null
}

interface TelegramLoginProps {
  onError: (message: string) => void
}

export function TelegramLogin({ onError }: TelegramLoginProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPathRef = useRef('/dashboard')
  const onErrorRef = useRef(onError)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const botUsername = normalizeBotUsername(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    nextPathRef.current = safeNextPath(searchParams.get('next'))
  }, [searchParams])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const handleAuth = useCallback(
    async (user: Record<string, unknown>) => {
      setLoading(true)
      onErrorRef.current('')

      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        })
        const data = (await res.json()) as ApiError

        if (!res.ok) {
          onErrorRef.current(data.error ?? 'Ошибка входа через Telegram')
          return
        }

        notifyAuthChanged()
        router.push(nextPathRef.current)
        router.refresh()
      } catch {
        onErrorRef.current('Сетевая ошибка')
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  useEffect(() => {
    if (!botUsername) return

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://oauth.telegram.org') return

      try {
        const payload = JSON.parse(String(event.data)) as {
          event?: string
          result?: Record<string, unknown>
        }
        if (payload.event === 'auth_result' && payload.result) {
          void handleAuth(payload.result)
        }
      } catch {
        // ignore unrelated postMessage payloads
      }
    }

    window.addEventListener('message', onMessage)

    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [botUsername, handleAuth])

  if (!botUsername) {
    return (
      <p className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-center text-sm text-danger-600">
        Telegram-бот не настроен. Задайте NEXT_PUBLIC_TELEGRAM_BOT_USERNAME в переменных окружения.
      </p>
    )
  }

  const iframeSrc =
    mounted &&
    `https://oauth.telegram.org/embed/${encodeURIComponent(botUsername)}?origin=${encodeURIComponent(window.location.origin)}&return_to=${encodeURIComponent(window.location.href)}&size=large&radius=8&request_access=write`

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-11 w-full max-w-[280px] justify-center">
        {iframeSrc ? (
          <iframe
            id="telegram-login-iframe"
            src={iframeSrc}
            width="100%"
            height="44"
            style={{ border: 'none', overflow: 'hidden' }}
            title="Войти через Telegram"
          />
        ) : (
          <div className="h-11 w-full rounded-lg bg-ink-100" aria-hidden="true" />
        )}
      </div>
      {loading && <p className="text-sm text-ink-500">Вход...</p>}
      <p className="text-center text-xs leading-relaxed text-ink-500">
        Если кнопка не появилась, в @BotFather выполните <strong>/setdomain</strong> и привяжите{' '}
        <strong>localhost</strong> (для разработки) или ваш домен на продакшене.
      </p>
    </div>
  )
}
