import Link from 'next/link'

interface LogoProps {
  href?: string
  tone?: 'dark' | 'light'
  className?: string
}

export function Logo({ href = '/', tone = 'dark', className = '' }: LogoProps) {
  const wordmark = tone === 'light' ? 'text-white' : 'text-ink-900'
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="16" cy="16" r="13.5" stroke="var(--color-brand-500)" strokeWidth="2.2" />
        <circle cx="16" cy="16" r="8.5" stroke="var(--color-brand-400)" strokeWidth="2" opacity="0.6" />
        <circle cx="16" cy="16" r="3.5" fill="var(--color-lamp-500)" />
      </svg>
      <span className={`font-serif text-lg font-bold tracking-tight ${wordmark}`}>
        Глубина
      </span>
    </Link>
  )
}
