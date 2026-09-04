'use client'

import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/LoadingState'
import { useFetch } from '@/lib/hooks/useFetch'
import type { ApiError, PaymentSettings } from '@/lib/types'

interface Plan {
  id: 'month' | 'year'
  name: string
  description: string
  highlighted?: boolean
  defaultPrice: string
}

const plans: Plan[] = [
  {
    id: 'month',
    name: 'Месяц',
    description: 'Доступ ко всем книгам на 30 дней',
    defaultPrice: '$9.99',
  },
  {
    id: 'year',
    name: 'Год',
    description: 'Доступ на 365 дней со скидкой',
    highlighted: true,
    defaultPrice: '$99.99',
  },
]

interface PaymentSettingsResponse extends ApiError {
  settings: PaymentSettings
}

export default function PricingPage() {
  const payment = useFetch<PaymentSettingsResponse>('/api/payment-settings')

  if (payment.loading) {
    return <LoadingState label="Загрузка тарифов..." />
  }

  const settings = payment.data?.settings
  const priceFor = (plan: Plan) => {
    if (plan.id === 'month') return settings?.price_month || plan.defaultPrice
    return settings?.price_year || plan.defaultPrice
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-12 text-center">
        <p className="kicker mb-2">Подписка</p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Тарифы
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-500">
          Полный доступ ко всем книгам по психологии на выбранный срок. Курсы приобретаются отдельно.
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
            <p className="mt-5 font-serif text-5xl font-bold text-ink-900">{priceFor(plan)}</p>
            <ButtonLink
              href={`/pricing/checkout?plan=${plan.id}`}
              variant={plan.highlighted ? 'primary' : 'outline'}
              size="lg"
              className="mt-7 w-full"
            >
              Оформить
            </ButtonLink>
          </Card>
        ))}
      </div>

      <div className="mt-8 rounded-card border border-ink-200 bg-white p-4 text-center text-sm text-ink-600">
        Оплата переводом на карту. После перевода отправьте чек в Telegram — подписку подтвердит
        администратор.
      </div>
    </div>
  )
}
