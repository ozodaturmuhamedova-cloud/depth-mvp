'use client'

import { useCallback, useEffect, useState } from 'react'

interface UseFetchOptions {
  skip?: boolean
}

type FetchErrorBody = { error?: string }

/**
 * Хук для простых GET-запросов. Убирает дублирование fetch/loading/error.
 * setState вызывается только после await — безопасно для эффектов.
 */
export function useFetch<T>(url: string, options: UseFetchOptions = {}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!options.skip)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (options.skip) return

    let ignore = false

    async function load() {
      setLoading(true)
      try {
        const res = await fetch(url)
        if (ignore) return
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as FetchErrorBody | null
          if (!ignore) setError(body?.error ?? `Ошибка ${res.status}`)
        } else {
          const body = (await res.json()) as T
          if (!ignore) {
            setData(body)
            setError('')
          }
        }
      } catch {
        if (!ignore) setError('Сетевая ошибка')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()

    return () => {
      ignore = true
    }
  }, [url, options.skip, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { data, loading, error, reload }
}
