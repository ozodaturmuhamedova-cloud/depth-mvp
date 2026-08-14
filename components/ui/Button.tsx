import Link from 'next/link'
import { ReactNode, ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-soft hover:bg-brand-700',
  accent: 'bg-lamp-500 text-white shadow-soft hover:bg-lamp-600',
  success: 'bg-success-600 text-white shadow-soft hover:bg-success-700',
  danger: 'bg-danger-600 text-white shadow-soft hover:bg-danger-700',
  outline: 'bg-white text-ink-800 border border-ink-300 hover:border-brand-500 hover:text-brand-700',
  ghost: 'text-brand-700 hover:bg-brand-50',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

interface CommonProps {
  variant?: Variant
  size?: Size
  className?: string
}

function classesFor({
  variant = 'primary',
  size = 'md',
  className = '',
}: CommonProps) {
  return [
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    sizeClasses[size],
    variantClasses[variant],
    className,
  ].join(' ')
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, CommonProps {}

export function Button({ variant, size, className, children, ...rest }: ButtonProps) {
  return (
    <button {...rest} className={classesFor({ variant, size, className })}>
      {children}
    </button>
  )
}

interface ButtonLinkProps extends CommonProps {
  href: string
  children: ReactNode
}

export function ButtonLink({ href, children, ...rest }: ButtonLinkProps) {
  return (
    <Link href={href} className={classesFor(rest)}>
      {children}
    </Link>
  )
}
