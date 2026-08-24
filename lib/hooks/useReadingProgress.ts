'use client'

import { useCallback, useState } from 'react'

export interface StoredReadingProgress {
  chapter: number
  visited: number[]
}

function progressKey(slug: string): string {
  return `book-progress:${slug}`
}

/**
 * Читает сохранённый прогресс книги. Заменяет собой старый неиспользуемый
 * ключ `progress-${slug}`, в который писали, но никогда не читали.
 */
export function loadReadingProgress(slug: string): StoredReadingProgress | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(progressKey(slug))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredReadingProgress>
    if (typeof parsed.chapter !== 'number' || !Array.isArray(parsed.visited)) return null
    return { chapter: parsed.chapter, visited: parsed.visited.filter((n) => typeof n === 'number') }
  } catch {
    return null
  }
}

function saveProgress(slug: string, progress: StoredReadingProgress): void {
  localStorage.setItem(progressKey(slug), JSON.stringify(progress))
  // Отдельный ключ читает дашборд для карточки «Продолжить чтение»
  // (см. app/dashboard/page.tsx) — сохраняем его формат без изменений.
  localStorage.setItem('lastBook', JSON.stringify({ slug, chapter: progress.chapter }))
}

/**
 * Прогресс чтения книги: текущая глава + набор посещённых глав,
 * персистентно хранится в localStorage. Инициализация (initFromChapter)
 * выполняется один раз извне, когда известны и главы книги, и приоритетный
 * источник начальной главы (URL-параметр либо сохранённый прогресс).
 */
export function useReadingProgress(slug: string | undefined) {
  const [currentChapter, setCurrentChapter] = useState(0)
  const [visited, setVisited] = useState<Set<number>>(new Set())
  const [initialized, setInitialized] = useState(false)

  const initFromChapter = useCallback(
    (index: number) => {
      if (!slug) return
      const stored = loadReadingProgress(slug)
      const nextVisited = new Set(stored?.visited ?? [])
      nextVisited.add(index)
      setCurrentChapter(index)
      setVisited(nextVisited)
      setInitialized(true)
      saveProgress(slug, { chapter: index, visited: Array.from(nextVisited) })
    },
    [slug]
  )

  const goToChapter = useCallback(
    (index: number) => {
      if (!slug) return
      setCurrentChapter(index)
      setVisited((prev) => {
        const next = new Set(prev)
        next.add(index)
        saveProgress(slug, { chapter: index, visited: Array.from(next) })
        return next
      })
    },
    [slug]
  )

  return { currentChapter, visited, initialized, goToChapter, initFromChapter }
}
