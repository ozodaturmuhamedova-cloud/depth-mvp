'use client'

import { useEffect, useRef } from 'react'
import { TableOfContents, type TocChapter } from './TableOfContents'

interface ChapterDrawerProps {
  open: boolean
  onClose: () => void
  chapters: TocChapter[]
  currentIndex: number
  visited: Set<number>
  onSelect: (index: number) => void
}

// Мобильный аналог ChapterSidebar.tsx: выезжающая слева панель с оверлеем.
// В проекте нет Radix/Headless UI, поэтому диалог реализован вручную —
// минимальный набор поведения (Escape, клик по оверлею, возврат фокуса).
export function ChapterDrawer({ open, onClose, chapters, currentIndex, visited, onSelect }: ChapterDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Оглавление"
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white p-5 shadow-lift outline-none"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Оглавление</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть оглавление"
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TableOfContents
            chapters={chapters}
            currentIndex={currentIndex}
            visited={visited}
            onSelect={(index) => {
              onSelect(index)
              onClose()
            }}
          />
        </div>
      </div>
    </div>
  )
}
