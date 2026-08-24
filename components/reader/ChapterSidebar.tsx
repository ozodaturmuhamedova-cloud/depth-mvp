import { TableOfContents, type TocChapter } from './TableOfContents'

interface ChapterSidebarProps {
  chapters: TocChapter[]
  currentIndex: number
  visited: Set<number>
  onSelect: (index: number) => void
}

// Постоянно видимая панель оглавления для широких экранов. На мобильных
// заменяется выезжающим ChapterDrawer.tsx.
export function ChapterSidebar({ chapters, currentIndex, visited, onSelect }: ChapterSidebarProps) {
  return (
    <aside className="hidden shrink-0 lg:block lg:w-72">
      <div className="sticky top-[88px] max-h-[calc(100vh-104px)] overflow-y-auto rounded-card border border-ink-200 bg-white p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Оглавление</h2>
        <TableOfContents chapters={chapters} currentIndex={currentIndex} visited={visited} onSelect={onSelect} />
      </div>
    </aside>
  )
}
