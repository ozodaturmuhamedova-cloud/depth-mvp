import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

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
            <p className="mt-5 font-serif text-5xl font-bold text-ink-900">{plan.price}</p>
            <Button variant={plan.highlighted ? 'primary' : 'outline'} size="lg" className="mt-7 w-full" disabled>
              Подписку выдаёт администратор
            </Button>
          </Card>
        ))}
      </div>

      <div className="mt-8 rounded-card border border-ink-200 bg-white p-4 text-center text-sm text-ink-600">
        Самостоятельное оформление подписки недоступно. Чтобы получить доступ, обратитесь к администратору —
        подписку выдают и продлевают вручную.
      </div>
    </div>
  )
}
