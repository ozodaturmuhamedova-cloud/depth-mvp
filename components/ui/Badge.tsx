import { ReactNode } from 'react'

type Variant = 'brand' | 'success' | 'warning' | 'danger' | 'neutral'

const variantClasses: Record<Variant, string> = {
  brand: 'bg-brand-100 text-brand-800',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-lamp-400/20 text-lamp-600',
  danger: 'bg-danger-100 text-danger-700',
  neutral: 'bg-ink-100 text-ink-700',
}

interface BadgeProps {
  children: ReactNode
  variant?: Variant
  className?: string
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
