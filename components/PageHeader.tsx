interface PageHeaderProps {
  title: string
  subtitle?: string
  kicker?: string
  align?: 'left' | 'center'
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  kicker,
  align = 'left',
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-8 ${align === 'center' ? 'text-center' : ''} ${className}`}>
      {kicker && <p className="kicker mb-2">{kicker}</p>}
      <h1 className="font-serif text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
        {title}
      </h1>
      {subtitle && (
        <p
          className={`mt-2 max-w-2xl text-lg text-ink-500 ${align === 'center' ? 'mx-auto' : ''}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
