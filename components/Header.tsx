import Link from 'next/link'
import { Logo } from './Logo'
import { AuthNav } from './AuthNav'
import { getSiteSettings } from '@/lib/site-settings'

const navLinks = [
  { href: '/books', label: 'Книги' },
  { href: '/courses', label: 'Курсы' },
  { href: '/pricing', label: 'Подписка' },
]

export async function Header() {
  const settings = await getSiteSettings()

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3.5">
          <Logo portraitUrl={settings.header_portrait_url} />
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-white hover:text-brand-700 hover:shadow-soft"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <AuthNav />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-3 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 shadow-card transition hover:border-brand-400 hover:text-brand-700"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}
