import { Inter, PT_Serif } from 'next/font/google'

export const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

export const ptSerif = PT_Serif({
  weight: ['400', '700'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-pt-serif',
  display: 'swap',
})
