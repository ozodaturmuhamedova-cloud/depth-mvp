'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { notifyAuthChanged } from '@/lib/auth-events'
import type { ApiError } from '@/lib/types'

// Разрешаем редиректить только на относительные внутренние пути, чтобы
// query-параметр ?next= нельзя было использовать для открытого редиректа.
function safeNextPath(value: string | null): string {
  if (!value) return '/dashboard'
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json()) as ApiError

      if (!res.ok) {
        setError(data.error ?? 'Ошибка входа')
        return
      }
      notifyAuthChanged()
      router.push(safeNextPath(searchParams.get('next')))
      router.refresh()
    } catch {
      setError('Сетевая ошибка')
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-md sm:mt-16">
      <Card variant="elevated" className="p-8 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-ink-900">Вход</h1>
          <p className="mt-1.5 text-sm text-ink-500">Рады видеть вас снова</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && (
            <p className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm text-danger-600">{error}</p>
          )}
          <Button type="submit" size="lg" className="w-full">
            Войти
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-600">
          Нет аккаунта?{' '}
          <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Зарегистрироваться
          </Link>
        </p>
      </Card>
    </div>
  )
}
