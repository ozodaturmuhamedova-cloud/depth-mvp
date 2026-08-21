import { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
}

export function Select({ label, hint, className = '', children, ...rest }: SelectProps) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="block text-sm font-medium text-ink-700">{label}</span>}
      <select
        {...rest}
        className={`w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${className}`}
      >
        {children}
      </select>
      {hint && <span className="block text-xs text-ink-500">{hint}</span>}
    </label>
  )
}
