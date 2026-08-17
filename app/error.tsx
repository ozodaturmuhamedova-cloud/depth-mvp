'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7.5V13M12 16.5v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="font-serif text-2xl font-bold text-ink-900">Что-то пошло не так</h1>
      <p className="max-w-md text-ink-500">
        Произошла непредвиденная ошибка. Попробуйте обновить страницу.
      </p>
      <Button onClick={reset}>Попробовать снова</Button>
    </div>
  )
}
