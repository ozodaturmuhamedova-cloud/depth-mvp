'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/LoadingState'
import { TextArea } from '@/components/ui/TextArea'
import { useFetch } from '@/lib/hooks/useFetch'
import { splitHtmlChapters, truncateHtmlPreview } from '@/lib/chapters'
import type { ApiError, ContentFormat, Lesson } from '@/lib/types'

interface AdminBook {
  id: number
  slug: string
  title: string
  author: string | null
  description: string | null
  category: string | null
  content: string
  preview: string | null
  cover_url: string | null
  content_format: ContentFormat
}

interface AdminCourse {
  id: number
  title: string
  description: string | null
  price_cents: number
  lessons: Lesson[]
}

interface BooksResponse extends ApiError {
  books: AdminBook[]
}

interface CoursesResponse extends ApiError {
  courses: AdminCourse[]
}

const emptyBookForm = {
  slug: '',
  title: '',
  author: '',
  description: '',
  category: '',
  content: '',
  preview: '',
  cover_url: '',
  content_format: 'text' as ContentFormat,
}

const emptyCourseForm = {
  title: '',
  description: '',
  price_cents: 0,
  lessons: '[]',
}

export function AdminPanel() {
  const router = useRouter()
  const [tab, setTab] = useState<'books' | 'courses'>('books')
  const [message, setMessage] = useState('')
  const [bookForm, setBookForm] = useState(emptyBookForm)
  const [courseForm, setCourseForm] = useState(emptyCourseForm)
  const [editingBook, setEditingBook] = useState<AdminBook | null>(null)
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [importingDocx, setImportingDocx] = useState(false)
  const [docxInfo, setDocxInfo] = useState('')

  const books = useFetch<BooksResponse>('/api/admin/books')
  const courses = useFetch<CoursesResponse>('/api/admin/courses')

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.refresh()
  }

  // --- Книги ---
  const resetBookForm = () => {
    setBookForm(emptyBookForm)
    setEditingBook(null)
    setDocxInfo('')
  }

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingBook ? `/api/admin/books/${editingBook.id}` : '/api/admin/books'
    const res = await fetch(url, {
      method: editingBook ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookForm),
    })
    const data = (await res.json().catch(() => null)) as ApiError | null
    if (res.ok) {
      setMessage(editingBook ? 'Книга обновлена' : 'Книга добавлена')
      resetBookForm()
      books.reload()
    } else {
      setMessage(data?.error ?? 'Ошибка сохранения')
    }
  }

  const handleEditBook = (book: AdminBook) => {
    setEditingBook(book)
    setDocxInfo('')
    setBookForm({
      slug: book.slug,
      title: book.title,
      author: book.author ?? '',
      description: book.description ?? '',
      category: book.category ?? '',
      content: book.content,
      preview: book.preview ?? '',
      cover_url: book.cover_url ?? '',
      content_format: book.content_format ?? 'text',
    })
  }

  const handleDocxFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImportingDocx(true)
    setMessage('')
    setDocxInfo('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/books/import-docx', { method: 'POST', body: formData })
      const data = (await res.json().catch(() => null)) as
        | (ApiError & { html?: string; chaptersCount?: number; title?: string | null })
        | null
      if (res.ok && data?.html) {
        // Превью тоже переводим в HTML (первая глава), иначе на странице книги
        // formatMismatch: content_format='html', а preview остался бы обычным текстом.
        // Обрезаем до короткого фрагмента: для книг без глав (или с одной
        // огромной первой главой) вся книга целиком не пролезала в лимит
        // preview и валидация на сервере падала с "Too big: ...".
        const firstChapterHtml = splitHtmlChapters(data.html)[0]?.html ?? data.html
        setBookForm((prev) => ({
          ...prev,
          content: data.html!,
          preview: truncateHtmlPreview(firstChapterHtml),
          content_format: 'html',
          title: prev.title || data.title || prev.title,
        }))
        setDocxInfo(`Импортировано глав: ${data.chaptersCount ?? 1}`)
      } else {
        setMessage(data?.error ?? 'Ошибка импорта .docx')
      }
    } catch {
      setMessage('Сетевая ошибка при импорте .docx')
    } finally {
      setImportingDocx(false)
    }
  }

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadingCover(true)
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/covers', { method: 'POST', body: formData })
      const data = (await res.json().catch(() => null)) as (ApiError & { url?: string }) | null
      if (res.ok && data?.url) {
        setBookForm((prev) => ({ ...prev, cover_url: data.url! }))
      } else {
        setMessage(data?.error ?? 'Ошибка загрузки обложки')
      }
    } catch {
      setMessage('Сетевая ошибка при загрузке обложки')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleDeleteBook = async (id: number) => {
    if (!confirm('Удалить книгу?')) return
    const res = await fetch(`/api/admin/books/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMessage('Книга удалена')
      books.reload()
    } else {
      setMessage('Ошибка удаления')
    }
  }

  // --- Курсы ---
  const resetCourseForm = () => {
    setCourseForm(emptyCourseForm)
    setEditingCourse(null)
  }

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault()

    let lessons: unknown
    try {
      lessons = JSON.parse(courseForm.lessons)
    } catch {
      setMessage('Уроки должны быть в формате JSON')
      return
    }

    const url = editingCourse ? `/api/admin/courses/${editingCourse.id}` : '/api/admin/courses'
    const res = await fetch(url, {
      method: editingCourse ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...courseForm, lessons }),
    })
    const data = (await res.json().catch(() => null)) as ApiError | null
    if (res.ok) {
      setMessage(editingCourse ? 'Курс обновлён' : 'Курс добавлен')
      resetCourseForm()
      courses.reload()
    } else {
      setMessage(data?.error ?? 'Ошибка сохранения')
    }
  }

  const handleEditCourse = (course: AdminCourse) => {
    setEditingCourse(course)
    setCourseForm({
      title: course.title,
      description: course.description ?? '',
      price_cents: course.price_cents,
      lessons: JSON.stringify(course.lessons, null, 2),
    })
  }

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Удалить курс?')) return
    const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMessage('Курс удалён')
      courses.reload()
    } else {
      setMessage('Ошибка удаления')
    }
  }

  if (books.loading || courses.loading) {
    return <LoadingState label="Загрузка данных..." />
  }

  const bookList = books.data?.books ?? []
  const courseList = courses.data?.courses ?? []

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="kicker mb-1">Администрирование</p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink-900">Админ-панель</h1>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-danger-500 hover:text-danger-600"
        >
          Выйти
        </button>
      </div>

      {message && (
        <div className="mb-6 rounded-card border border-ink-200 bg-white p-3.5 text-sm text-ink-700 shadow-card">
          {message}
        </div>
      )}

      <div className="mb-6 flex gap-2">
        <Button
          variant={tab === 'books' ? 'primary' : 'outline'}
          onClick={() => {
            setTab('books')
            setMessage('')
          }}
        >
          Книги
        </Button>
        <Button
          variant={tab === 'courses' ? 'primary' : 'outline'}
          onClick={() => {
            setTab('courses')
            setMessage('')
          }}
        >
          Курсы
        </Button>
      </div>

      {tab === 'books' && (
        <div>
          <h2 className="mb-4 font-serif text-2xl font-bold text-ink-900">
            {editingBook ? 'Редактировать книгу' : 'Добавить книгу'}
          </h2>
          <form
            onSubmit={handleSaveBook}
            className="mb-8 space-y-4 rounded-card border border-ink-200 bg-white p-5 shadow-card sm:p-6"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                placeholder="Slug *"
                value={bookForm.slug}
                onChange={(e) => setBookForm({ ...bookForm, slug: e.target.value })}
                required
              />
              <Input
                placeholder="Название *"
                value={bookForm.title}
                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                required
              />
              <Input
                placeholder="Автор"
                value={bookForm.author}
                onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
              />
              <Input
                placeholder="Категория"
                value={bookForm.category}
                onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
              />
              <div className="flex items-start gap-3 md:col-span-2">
                {bookForm.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bookForm.cover_url}
                    alt="Превью обложки"
                    className="h-[110px] w-20 shrink-0 rounded-lg border border-ink-200 object-cover"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="URL обложки"
                    value={bookForm.cover_url}
                    onChange={(e) => setBookForm({ ...bookForm, cover_url: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink-300 bg-white px-3.5 py-2 text-sm font-medium text-ink-700 transition hover:border-brand-500 hover:text-brand-700">
                      Загрузить с компьютера
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        onChange={handleCoverFileChange}
                        disabled={uploadingCover}
                        className="hidden"
                      />
                    </label>
                    {uploadingCover && (
                      <span className="text-sm text-ink-500">Загрузка...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <TextArea
              placeholder="Описание"
              value={bookForm.description}
              onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
              rows={2}
            />
            <TextArea
              placeholder={bookForm.content_format === 'html' ? 'Превью (HTML)' : 'Превью (Markdown)'}
              value={bookForm.preview}
              onChange={(e) => setBookForm({ ...bookForm, preview: e.target.value })}
              rows={3}
              className={bookForm.content_format === 'html' ? 'font-mono text-sm' : undefined}
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink-300 bg-white px-3.5 py-2 text-sm font-medium text-ink-700 transition hover:border-brand-500 hover:text-brand-700">
                  Импортировать .docx
                  <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleDocxFileChange}
                    disabled={importingDocx}
                    className="hidden"
                  />
                </label>
                {importingDocx && <span className="text-sm text-ink-500">Обработка файла...</span>}
                {docxInfo && <span className="text-sm text-success-600">{docxInfo}</span>}
                {bookForm.content_format === 'html' && (
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                    Формат: HTML (из .docx)
                  </span>
                )}
              </div>
              <TextArea
                placeholder={
                  bookForm.content_format === 'html'
                    ? 'Полный контент (HTML, импортирован из .docx) *'
                    : 'Полный контент (Markdown) *'
                }
                value={bookForm.content}
                onChange={(e) => setBookForm({ ...bookForm, content: e.target.value })}
                rows={6}
                required
                className={bookForm.content_format === 'html' ? 'font-mono text-sm' : undefined}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" variant="success" disabled={uploadingCover}>
                {editingBook ? 'Обновить' : 'Добавить'}
              </Button>
              {editingBook && (
                <Button type="button" variant="outline" onClick={resetBookForm}>
                  Отмена
                </Button>
              )}
            </div>
          </form>

          <h3 className="mb-3 text-xl font-bold text-ink-900">Список книг</h3>
          <div className="space-y-2">
            {bookList.map((book) => (
              <div
                key={book.id}
                className="flex items-center justify-between gap-3 rounded-card border border-ink-200 bg-white px-4 py-3 shadow-card"
              >
                <div className="min-w-0">
                  <strong className="text-ink-900">{book.title}</strong>
                  <span className="text-sm text-ink-500"> (slug: {book.slug})</span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleEditBook(book)}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    Ред.
                  </button>
                  <button
                    onClick={() => handleDeleteBook(book.id)}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-danger-600 transition hover:bg-danger-50 hover:text-danger-700"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'courses' && (
        <div>
          <h2 className="mb-4 font-serif text-2xl font-bold text-ink-900">
            {editingCourse ? 'Редактировать курс' : 'Добавить курс'}
          </h2>
          <form
            onSubmit={handleSaveCourse}
            className="mb-8 space-y-4 rounded-card border border-ink-200 bg-white p-5 shadow-card sm:p-6"
          >
            <Input
              placeholder="Название *"
              value={courseForm.title}
              onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
              required
            />
            <TextArea
              placeholder="Описание"
              value={courseForm.description}
              onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
              rows={2}
            />
            <Input
              type="number"
              placeholder="Цена в центах *"
              value={courseForm.price_cents}
              onChange={(e) =>
                setCourseForm({ ...courseForm, price_cents: Number(e.target.value) })
              }
              required
            />
            <TextArea
              placeholder="Уроки (JSON массив) *"
              value={courseForm.lessons}
              onChange={(e) => setCourseForm({ ...courseForm, lessons: e.target.value })}
              className="font-mono text-sm"
              rows={8}
              required
            />
            <div className="flex gap-3">
              <Button type="submit" variant="success">
                {editingCourse ? 'Обновить' : 'Добавить'}
              </Button>
              {editingCourse && (
                <Button type="button" variant="outline" onClick={resetCourseForm}>
                  Отмена
                </Button>
              )}
            </div>
          </form>

          <h3 className="mb-3 text-xl font-bold text-ink-900">Список курсов</h3>
          <div className="space-y-2">
            {courseList.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between gap-3 rounded-card border border-ink-200 bg-white px-4 py-3 shadow-card"
              >
                <div className="min-w-0">
                  <strong className="text-ink-900">{course.title}</strong>
                  <span className="text-sm text-ink-500">
                    {' '}
                    — ${(course.price_cents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleEditCourse(course)}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    Ред.
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-danger-600 transition hover:bg-danger-50 hover:text-danger-700"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
