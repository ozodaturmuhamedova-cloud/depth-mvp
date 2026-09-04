'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/LoadingState'
import { useFetch } from '@/lib/hooks/useFetch'
import type { ApiError, PaymentSettings, User } from '@/lib/types'

interface MeResponse extends ApiError {
  user?: User
}

interface PaymentSettingsResponse extends ApiError {
  settings: PaymentSettings
}

const PLAN_META = {
  month: { name: 'Месяц', defaultPrice: '$9.99' },
  year: { name: 'Год', defaultPrice: '$99.99' },
} as const

type PlanId = keyof typeof PLAN_META

function isPlanId(value: string | null): value is PlanId {
  return value === 'month' || value === 'year'
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan')
  const plan = isPlanId(planParam) ? planParam : null

  const me = useFetch<MeResponse>('/api/me')
  const payment = useFetch<PaymentSettingsResponse>('/api/payment-settings')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (me.error) {
      const next = plan
        ? `/pricing/checkout?plan=${plan}`
        : '/pricing/checkout'
      router.push(`/login?next=${encodeURIComponent(next)}`)
    }
  }, [me.error, plan, router])

  if (!plan) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="font-serif text-2xl font-bold text-ink-900">Тариф не выбран</h1>
        <p className="mt-2 text-ink-500">Вернитесь к тарифам и выберите месяц или год.</p>
        <ButtonLink href="/pricing" className="mt-6">
          К тарифам
        </ButtonLink>
      </div>
    )
  }

  if (me.loading || payment.loading || me.error) {
    return <LoadingState label="Загрузка инструкции..." />
  }

  const settings = payment.data?.settings
  const meta = PLAN_META[plan]
  const price =
    (plan === 'month' ? settings?.price_month : settings?.price_year) || meta.defaultPrice
  const cardNumber = settings?.payment_card_number?.trim() || ''
  const cardHolder = settings?.payment_card_holder?.trim() || ''
  const telegramUrl = settings?.payment_telegram_url?.trim() || ''

  const handleCopyCard = async () => {
    if (!cardNumber) return
    try {
      await navigator.clipboard.writeText(cardNumber.replace(/\s+/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 text-center">
        <p className="kicker mb-2">Оформление</p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink-900">
          Подписка «{meta.name}»
        </h1>
        <p className="mt-2 text-ink-500">Следуйте шагам ниже, чтобы получить доступ ко всем книгам.</p>
      </div>

      <ol className="space-y-4">
        <li>
          <Card className="p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Шаг 1</p>
            <h2 className="mt-1 font-serif text-xl font-bold text-ink-900">Переведите оплату</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-ink-500">Номер карты</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-semibold text-ink-900">
                    {cardNumber || 'Не указан — обратитесь к администратору'}
                  </span>
                  {cardNumber && (
                    <Button type="button" variant="outline" size="sm" onClick={handleCopyCard}>
                      {copied ? 'Скопировано' : 'Копировать'}
                    </Button>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Имя держателя</dt>
                <dd className="mt-1 font-medium text-ink-900">
                  {cardHolder || 'Не указано'}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Сумма</dt>
                <dd className="mt-1 font-serif text-2xl font-bold text-ink-900">{price}</dd>
              </div>
            </dl>
          </Card>
        </li>

        <li>
          <Card className="p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Шаг 2</p>
            <h2 className="mt-1 font-serif text-xl font-bold text-ink-900">
              Сохраните чек и отправьте в Telegram
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              Сделайте скриншот или сохраните чек перевода и отправьте его администратору в Telegram.
            </p>
            {telegramUrl ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-700"
              >
                Открыть Telegram
              </a>
            ) : (
              <p className="mt-4 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-600">
                Ссылка на Telegram ещё не настроена. Напишите администратору напрямую.
              </p>
            )}
          </Card>
        </li>

        <li>
          <Card className="p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Шаг 3</p>
            <h2 className="mt-1 font-serif text-xl font-bold text-ink-900">Ожидайте подтверждение</h2>
            <p className="mt-2 text-sm text-ink-600">
              После проверки чека администратор активирует подписку. Статус можно посмотреть в
              личном кабинете.
            </p>
            <ButtonLink href="/dashboard" variant="outline" className="mt-4 w-full">
              Перейти в кабинет
            </ButtonLink>
          </Card>
        </li>
      </ol>

      <p className="mt-6 text-center text-sm text-ink-500">
        <ButtonLink href="/pricing" variant="ghost" size="sm">
          ← Назад к тарифам
        </ButtonLink>
      </p>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingState label="Загрузка инструкции..." />}>
      <CheckoutContent />
    </Suspense>
  )
}
