'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import type { ApiError } from '@/lib/types'

export function AdminLoginForm() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = (await res.json().catch(() => null)) as ApiError | null
      if (res.ok) {
        router.refresh()
      } else {
        setMessage(data?.error ?? 'Неверный пароль')
        setSubmitting(false)
      }
    } catch {
      setMessage('Ошибка сети')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-md sm:mt-16">
      <Card variant="elevated" className="p-8">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl font-bold text-ink-900">Админ-панель</h1>
          <p className="mt-1.5 text-sm text-ink-500">Вход для администратора</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {message && (
            <p className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm text-danger-600">
              {message}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Вход...' : 'Войти'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
