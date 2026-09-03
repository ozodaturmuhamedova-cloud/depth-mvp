import Image from 'next/image'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { getSiteSettings } from '@/lib/site-settings'

// Герой-блок и хедер читают настройки на каждый запрос, чтобы фото/имя автора,
// загруженные в админке, отображались сразу без пересборки страницы.
export const dynamic = 'force-dynamic'

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

export default async function Home() {
  const hero = await getSiteSettings()
  const hasHeroImage = !!hero.hero_image_url && hero.hero_image_url.startsWith('/')
  const authorName = hero.hero_author_name || 'Озода Турмухамедова'
  const authorRole = hero.hero_author_role || 'Психолог, автор книг'

  const heading = (
    <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-6xl">
      Психология{' '}
      <span className="relative whitespace-nowrap text-brand-600">
        простыми словами
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
  )

  return (
    <div className="py-4 sm:py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-ink-200 bg-gradient-to-b from-white via-white to-brand-50 px-6 py-16 sm:px-12 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full border-[22px] border-brand-100/80"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full border-[26px] border-lamp-400/20"
        />

        {hasHeroImage ? (
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_minmax(0,380px)]">
            <div>
              <Badge variant="brand" className="mb-6">
                Психология без спешки
              </Badge>
              {heading}
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
                Читайте лучшие книги по психологии и проходите курсы от экспертов.
                Начните прямо сейчас.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <ButtonLink href="/pricing" size="lg">
                  Тарифы подписки
                </ButtonLink>
                <ButtonLink href="/books" variant="outline" size="lg">
                  Смотреть книги
                </ButtonLink>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <Link href="/books?lang=ru" className="font-semibold text-brand-600 hover:text-brand-700">
                  Книги на русском
                </Link>
                <Link href="/books?lang=uz" className="font-semibold text-brand-600 hover:text-brand-700">
                  Ўзбек тилида китоблар
                </Link>
                <Link href="/courses?lang=ru" className="font-semibold text-brand-600 hover:text-brand-700">
                  Курсы на русском
                </Link>
                <Link href="/courses?lang=uz" className="font-semibold text-brand-600 hover:text-brand-700">
                  Ўзбек тилида курслар
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[320px] lg:max-w-[380px]">
              <div
                aria-hidden="true"
                className="absolute -inset-3 rounded-[2.5rem] border border-lamp-400/40"
              />
              <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] bg-ink-100 shadow-lift">
                <Image
                  src={hero.hero_image_url!}
                  alt={authorName}
                  fill
                  preload
                  sizes="(min-width:1024px) 380px, 90vw"
                  className="object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/75 to-transparent p-5">
                  <p className="font-serif text-lg font-bold text-white">{authorName}</p>
                  <p className="text-sm text-white/80">{authorRole}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative text-center">
            <Badge variant="brand" className="mb-6">
              Психология без спешки
            </Badge>
            <div className="mx-auto">{heading}</div>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
              Читайте лучшие книги по психологии и проходите курсы от экспертов.
              Начните прямо сейчас.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/pricing" size="lg">
                Тарифы подписки
              </ButtonLink>
              <ButtonLink href="/books" variant="outline" size="lg">
                Смотреть книги
              </ButtonLink>
            </div>
          </div>
        )}
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
