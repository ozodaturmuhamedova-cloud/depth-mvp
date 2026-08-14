import { TextareaHTMLAttributes } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export function TextArea({ label, hint, className = '', ...rest }: TextAreaProps) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="block text-sm font-medium text-ink-700">{label}</span>}
      <textarea
        {...rest}
        className={`w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${className}`}
      />
      {hint && <span className="block text-xs text-ink-500">{hint}</span>}
    </label>
  )
}
