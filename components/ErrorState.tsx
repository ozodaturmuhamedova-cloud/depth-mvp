interface ErrorStateProps {
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function ErrorState({ message, actionLabel, onAction }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 7.5V13M12 16.5v.01"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="max-w-md text-ink-700">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-sm font-semibold text-brand-600 underline-offset-4 transition hover:text-brand-700 hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
