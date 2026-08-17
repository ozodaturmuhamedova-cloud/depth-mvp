import Link from 'next/link'
import { Logo } from './Logo'

const sections = [
  {
    title: 'Разделы',
    links: [
      { href: '/books', label: 'Книги' },
      { href: '/courses', label: 'Курсы' },
      { href: '/pricing', label: 'Подписка' },
    ],
  },
  {
    title: 'Аккаунт',
    links: [
      { href: '/login', label: 'Вход' },
      { href: '/register', label: 'Регистрация' },
      { href: '/dashboard', label: 'Личный кабинет' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-16 bg-brand-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-4">
            <Logo tone="light" />
            <p className="text-sm leading-relaxed text-brand-200">
              Читайте лучшие книги и проходите курсы по психологии вдумчиво и не спеша.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {sections.map((section) => (
              <nav key={section.title}>
                <p className="text-sm font-semibold text-white">{section.title}</p>
                <ul className="mt-3 space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-brand-200 transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-10 border-t border-brand-900 pt-6 text-center">
          <p className="text-xs text-brand-300">
            © {new Date().getFullYear()} Озода Турмухамедова. Проект о психологии.
          </p>
        </div>
      </div>
    </footer>
  )
}
