'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { ApiError } from '@/lib/types'

interface Plan {
  id: 'month' | 'year'
  name: string
  price: string
  description: string
  highlighted?: boolean
}

const plans: Plan[] = [
  {
    id: 'month',
    name: 'Месяц',
    price: '$9.99',
    description: 'Доступ ко всем книгам на 30 дней',
  },
  {
    id: 'year',
    name: 'Год',
    price: '$99.99',
    description: 'Доступ на 365 дней со скидкой',
    highlighted: true,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (plan: 'month' | 'year') => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = (await res.json()) as ApiError
      if (res.ok) {
        setMessage(`Подписка "${plan}" успешно оформлена!`)
        setTimeout(() => router.push('/dashboard'), 1000)
      } else {
        setMessage(data.error ?? 'Ошибка при оформлении подписки')
      }
    } catch {
      setMessage('Сетевая ошибка')
    } finally {
      setLoading(false)
    }
  }

  const success = message.includes('успешно')

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-12 text-center">
        <p className="kicker mb-2">Подписка</p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Выберите план
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-500">
          Доступ ко всем книгам и курсам по психологии на ваш срок.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            variant={plan.highlighted ? 'elevated' : 'surface'}
            className={`relative p-8 text-center ${plan.highlighted ? 'ring-2 ring-brand-500' : ''}`}
          >
            {plan.highlighted && (
              <Badge variant="brand" className="absolute -top-3 left-1/2 -translate-x-1/2">
                Популярный
              </Badge>
            )}
            <h2 className="font-serif text-2xl font-bold text-ink-900">{plan.name}</h2>
            <p className="mt-1 text-sm text-ink-500">{plan.description}</p>
            <p className="mt-5 font-serif text-5xl font-bold text-ink-900">{plan.price}</p>
            <Button
              variant={plan.highlighted ? 'primary' : 'outline'}
              size="lg"
              className="mt-7 w-full"
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading}
            >
              {loading ? 'Оформляем...' : `Оформить ${plan.name.toLowerCase()}`}
            </Button>
          </Card>
        ))}
      </div>

      {message && (
        <div
          className={`mt-8 rounded-card p-4 text-center text-sm font-medium ${
            success ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-600'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  )
}
