import { ProgressBar } from '@/components/ui/ProgressBar'

export interface TocChapter {
  title: string
}

interface TableOfContentsProps {
  chapters: TocChapter[]
  currentIndex: number
  visited: Set<number>
  onSelect: (index: number) => void
}

// Общий список глав, используется и в десктопном сайдбаре, и в мобильном
// drawer (см. ChapterSidebar.tsx / ChapterDrawer.tsx) — единственный
// источник разметки, чтобы обе панели не расходились между собой.
export function TableOfContents({ chapters, currentIndex, visited, onSelect }: TableOfContentsProps) {
  const readCount = visited.size

  return (
    <div>
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-500">
          <span>Прочитано</span>
          <span>
            {readCount} из {chapters.length}
          </span>
        </div>
        <ProgressBar value={chapters.length ? (readCount / chapters.length) * 100 : 0} />
      </div>

      <ol className="space-y-1">
        {chapters.map((ch, idx) => {
          const isActive = idx === currentIndex
          const isVisited = visited.has(idx)

          return (
            <li key={idx}>
              <button
                type="button"
                onClick={() => onSelect(idx)}
                aria-current={isActive ? 'true' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-soft'
                    : 'text-ink-700 hover:bg-brand-50 hover:text-brand-700'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isVisited
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  {isVisited && !isActive ? (
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M3.5 8.5 6.5 11.5 12.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </span>
                <span className={`min-w-0 flex-1 truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {ch.title || `Глава ${idx + 1}`}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
