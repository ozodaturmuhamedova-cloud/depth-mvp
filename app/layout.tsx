import './globals.css'
import type { Metadata } from 'next'
import { inter, ptSerif } from './fonts'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Озода Турмухамедова — книги и курсы по психологии',
  description: 'Платформа для чтения книг и прохождения курсов по психологии',
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
