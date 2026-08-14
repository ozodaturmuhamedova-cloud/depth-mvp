import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

export function Input({ label, hint, className = '', ...rest }: InputProps) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="block text-sm font-medium text-ink-700">{label}</span>}
      <input
        {...rest}
        className={`w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${className}`}
      />
      {hint && <span className="block text-xs text-ink-500">{hint}</span>}
    </label>
  )
}
