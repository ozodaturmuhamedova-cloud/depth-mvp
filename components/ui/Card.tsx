import { ReactNode } from 'react'

type Variant = 'surface' | 'elevated' | 'interactive'

const variantClasses: Record<Variant, string> = {
  surface: 'bg-white border border-ink-200',
  elevated: 'bg-white border border-transparent shadow-lift',
  interactive:
    'bg-white border border-ink-200 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift',
}

interface CardProps {
  children: ReactNode
  variant?: Variant
  className?: string
}

export function Card({ children, variant = 'surface', className = '' }: CardProps) {
  return <div className={`rounded-card ${variantClasses[variant]} ${className}`}>{children}</div>
}
