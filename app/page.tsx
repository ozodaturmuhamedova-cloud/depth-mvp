import Link from 'next/link'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const features = [
  {
    title: 'Книги',
    description:
      'Лучшие книги по психологии с бесплатным фрагментом — читайте вдумчиво и в своём темпе.',
    href: '/books',
    cta: 'Каталог книг',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5v-14Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Курсы',
    description: 'Практические курсы от экспертов с отслеживанием прогресса и проверкой себя.',
    href: '/courses',
    cta: 'Смотреть курсы',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4 2.5 9 12 14l9.5-5L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m5.5 11.5-3 1.5L12 18l9.5-5-3-1.5M5.5 16.5 12 20l6.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function Home() {
  return (
    <div className="py-4 sm:py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-ink-200 bg-gradient-to-b from-white via-white to-brand-50 px-6 py-16 text-center sm:px-12 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full border-[22px] border-brand-100/80"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full border-[26px] border-lamp-400/20"
        />

        <Badge variant="brand" className="mb-6">
          Психология без спешки
        </Badge>
        <h1 className="mx-auto max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-6xl">
          Психология на{' '}
          <span className="relative whitespace-nowrap text-brand-600">
            глубине
            <svg
              viewBox="0 0 200 12"
              fill="none"
              aria-hidden="true"
              className="absolute -bottom-2 left-0 w-full text-lamp-400"
            >
              <path
                d="M2 9c48-6 148-6 196 0"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
          Читайте лучшие книги по психологии и проходите курсы от экспертов.
          Начните прямо сейчас.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/pricing" size="lg">
            Оформить подписку
          </ButtonLink>
          <ButtonLink href="/books" variant="outline" size="lg">
            Смотреть книги
          </ButtonLink>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="group flex flex-col rounded-card border border-ink-200 bg-white p-8 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
              {feature.icon}
            </div>
            <h2 className="mt-5 font-serif text-2xl font-bold text-ink-900">{feature.title}</h2>
            <p className="mt-2 flex-1 leading-relaxed text-ink-600">{feature.description}</p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition group-hover:gap-2.5 group-hover:text-brand-700">
              {feature.cta}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3 8h10m0 0-3.5-3.5M13 8 9.5 11.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
