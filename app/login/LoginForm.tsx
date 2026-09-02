'use client'

import { useState } from 'react'
import { Suspense } from 'react'
import { Card } from '@/components/ui/Card'
import { TelegramLogin } from '@/components/TelegramLogin'

function LoginContent() {
  const [error, setError] = useState('')

  return (
    <div className="mx-auto mt-6 max-w-md sm:mt-16">
      <Card variant="elevated" className="p-8 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-ink-900">Вход</h1>
          <p className="mt-1.5 text-sm text-ink-500">Войдите через Telegram в свой аккаунт</p>
        </div>
        <TelegramLogin onError={setError} />
        {error && (
          <p className="mt-4 rounded-lg bg-danger-50 px-3.5 py-2.5 text-center text-sm text-danger-600">
            {error}
          </p>
        )}
      </Card>
    </div>
  )
}

export function LoginForm() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
