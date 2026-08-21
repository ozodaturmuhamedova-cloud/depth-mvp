'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { notifyAuthChanged } from '@/lib/auth-events'
import type { ApiError } from '@/lib/types'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Пароль должен быть минимум 8 символов')
      return
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const data = (await res.json()) as ApiError

      if (!res.ok) {
        setError(data.error ?? 'Ошибка регистрации')
        return
      }
      notifyAuthChanged()
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Сетевая ошибка')
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-md sm:mt-16">
      <Card variant="elevated" className="p-8 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-ink-900">Регистрация</h1>
          <p className="mt-1.5 text-sm text-ink-500">Создайте аккаунт и начните читать</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Имя (необязательно)"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            autoComplete="new-password"
            hint="Минимум 8 символов, буквы и цифры"
          />
          {error && (
            <p className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm text-danger-600">{error}</p>
          )}
          <Button type="submit" size="lg" className="w-full">
            Зарегистрироваться
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-600">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Войти
          </Link>
        </p>
      </Card>
    </div>
  )
}
