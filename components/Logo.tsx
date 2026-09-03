import Link from 'next/link'
import Image from 'next/image'

interface LogoProps {
  href?: string
  tone?: 'dark' | 'light'
  className?: string
  /** Портрет рядом с логотипом (локальный URL вида /api/covers/...). */
  portraitUrl?: string | null
}

export function Logo({ href = '/', tone = 'dark', className = '', portraitUrl }: LogoProps) {
  const wordmark = tone === 'light' ? 'text-white' : 'text-ink-900'
  const hasPortrait = !!portraitUrl && portraitUrl.startsWith('/')

  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`}>
      {hasPortrait && (
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-ink-200 bg-ink-100 shadow-soft ring-2 ring-white/80">
          <Image
            src={portraitUrl}
            alt=""
            fill
            sizes="36px"
            className="object-cover object-top"
          />
        </span>
      )}
      <svg
        width="34"
        height="34"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="16" cy="16" r="15" fill="var(--color-brand-600)" />
        <text
          x="16"
          y="21.5"
          textAnchor="middle"
          fontFamily="var(--font-pt-serif, serif)"
          fontSize="13"
          fontWeight="700"
          fill="var(--color-lamp-500)"
        >
          ОТ
        </text>
      </svg>
      <span className={`font-serif text-sm font-bold leading-tight tracking-tight ${wordmark}`}>
        Озода
        <br />
        Турмухамедова
      </span>
    </Link>
  )
}
