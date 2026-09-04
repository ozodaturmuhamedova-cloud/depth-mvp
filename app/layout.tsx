import './globals.css'
import type { Metadata } from 'next'
import { inter, ptSerif } from './fonts'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Озода Турмухамедова — книги и курсы по психологии',
  description:
    'Книги и курсы Озоды Турмухамедовой по психологии. Читайте книги Озода Турмухамедова и проходите курсы психолога онлайн.',
  keywords: [
    'Озода Турмухамедова',
    'Озода Турмухамедова психолог',
    'книги Озода Турмухамедова',
    'Озода Турмухамедова книги',
    'курсы Озода Турмухамедова',
    'Озода Турмухамедова курсы',
    'психолог Озода Турмухамедова',
    'психология Озода Турмухамедова',
    'книги по психологии',
    'курсы по психологии',
    'Ozoda Turmukhamedova',
    'Ozoda Turmuhamedova',
  ],
  authors: [{ name: 'Озода Турмухамедова' }],
  creator: 'Озода Турмухамедова',
  openGraph: {
    title: 'Озода Турмухамедова — книги и курсы по психологии',
    description:
      'Книги и курсы Озоды Турмухамедовой по психологии. Читайте книги и проходите курсы психолога онлайн.',
    locale: 'ru_RU',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={`${inter.variable} ${ptSerif.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
