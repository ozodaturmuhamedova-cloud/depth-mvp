'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LoadingState } from '@/components/LoadingState'
import { useFetch } from '@/lib/hooks/useFetch'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import type { AdminUserDetail, AdminUserListItem, AdminUserListResponse, ApiError } from '@/lib/types'

type RoleFilter = 'all' | 'user' | 'admin'
type SubFilter = 'all' | 'active' | 'none'
type SortOption = 'created_desc' | 'created_asc' | 'name_asc'

const PER_PAGE_OPTIONS = [10, 25, 50]

const PLAN_LABEL: Record<string, string> = {
  month: 'Месяц',
  year: 'Год',
}

function formatTelegramUser(user: {
  telegram_username: string | null
  telegram_id: number | null
  name: string | null
}): string {
  if (user.telegram_username) return `@${user.telegram_username}`
  if (user.telegram_id) return `ID ${user.telegram_id}`
  return user.name ?? '—'
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU')
}

function isSubscriptionActive(activeUntil: string | null): boolean {
  if (!activeUntil) return false
  return new Date(activeUntil).getTime() > Date.now()
}

function SubscriptionBadge({ activeUntil }: { activeUntil: string | null }) {
  if (isSubscriptionActive(activeUntil)) {
    return <Badge variant="success">Активна до {formatDate(activeUntil)}</Badge>
  }
  if (activeUntil) {
    return <Badge variant="warning">Истекла {formatDate(activeUntil)}</Badge>
  }
  return <Badge variant="neutral">Нет</Badge>
}

interface UserDetailResponse extends ApiError {
  user?: AdminUserDetail
}

function UserDetailPanel({
  userId,
  onClose,
  onChanged,
}: {
  userId: number
  onClose: () => void
  onChanged: () => void
}) {
  const { data, loading, error, reload } = useFetch<UserDetailResponse>(`/api/admin/users/${userId}`)
  const [plan, setPlan] = useState<'month' | 'year'>('month')
  const [customDays, setCustomDays] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const user = data?.user

  const handleGrant = async () => {
    setSaving(true)
    setMessage('')
    try {
      const days = customDays.trim() ? Number(customDays.trim()) : undefined
      const body = days ? { days } : { plan }
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const resBody = (await res.json().catch(() => null)) as ApiError | null
      if (res.ok) {
        setMessage('Подписка выдана')
        setCustomDays('')
        reload()
        onChanged()
      } else {
        setMessage(resBody?.error ?? 'Ошибка при выдаче подписки')
      }
    } catch {
      setMessage('Сетевая ошибка')
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm('Отозвать подписку у этого пользователя?')) return
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, { method: 'DELETE' })
      if (res.ok) {
        setMessage('Подписка отозвана')
        reload()
        onChanged()
      } else {
        setMessage('Ошибка при отзыве подписки')
      }
    } catch {
      setMessage('Сетевая ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-card border border-ink-200 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-ink-900">Информация о пользователе</h3>
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-500 transition hover:bg-ink-100"
        >
          Закрыть
        </button>
      </div>

      {loading && <LoadingState label="Загрузка..." />}
      {error && <p className="text-sm text-danger-600">{error}</p>}

      {user && (
        <div className="space-y-5">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-500">Telegram</dt>
              <dd className="font-medium text-ink-900">{formatTelegramUser(user)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Имя</dt>
              <dd className="font-medium text-ink-900">{user.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Роль</dt>
              <dd>
                <Badge variant={user.role === 'admin' ? 'brand' : 'neutral'}>
                  {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Дата регистрации</dt>
              <dd className="font-medium text-ink-900">{formatDate(user.created_at)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Последний вход</dt>
              <dd className="font-medium text-ink-900">{formatDate(user.last_login_at)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Подписка</dt>
              <dd>
                {user.subscription ? (
                  <span className="font-medium text-ink-900">
                    {PLAN_LABEL[user.subscription.plan] ?? user.subscription.plan} —{' '}
                    <SubscriptionBadge activeUntil={user.subscription.active_until} />
                  </span>
                ) : (
                  <Badge variant="neutral">Нет</Badge>
                )}
              </dd>
            </div>
          </dl>

          {user.role === 'admin' ? (
            <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
              У администратора доступ ко всем книгам всегда открыт — управлять подпиской не требуется.
            </p>
          ) : (
            <div className="space-y-3 border-t border-ink-100 pt-4">
              <h4 className="font-semibold text-ink-900">Управление подпиской</h4>
              <div className="flex flex-wrap items-end gap-3">
                <Select
                  label="План"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as 'month' | 'year')}
                  disabled={!!customDays.trim()}
                >
                  <option value="month">Месяц (30 дней)</option>
                  <option value="year">Год (365 дней)</option>
                </Select>
                <Input
                  label="Или количество дней"
                  type="number"
                  min={1}
                  placeholder="Например, 14"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="max-w-[160px]"
                />
                <Button variant="success" onClick={handleGrant} disabled={saving}>
                  {user.subscription ? 'Продлить' : 'Выдать'}
                </Button>
                {user.subscription && (
                  <Button variant="danger" onClick={handleRevoke} disabled={saving}>
                    Отозвать
                  </Button>
                )}
              </div>
              {message && <p className="text-sm text-ink-600">{message}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function UsersTab() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [role, setRole] = useState<RoleFilter>('all')
  const [sub, setSub] = useState<SubFilter>('all')
  const [sort, setSort] = useState<SortOption>('created_desc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const url = useMemo(() => {
    const params = new URLSearchParams()
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    if (role !== 'all') params.set('role', role)
    if (sub !== 'all') params.set('sub', sub)
    if (sort !== 'created_desc') params.set('sort', sort)
    params.set('page', String(page))
    params.set('perPage', String(perPage))
    return `/api/admin/users?${params.toString()}`
  }, [debouncedSearch, role, sub, sort, page, perPage])

  const { data, loading, error, reload } = useFetch<AdminUserListResponse>(url)

  const users: AdminUserListItem[] = data?.users ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd = Math.min(page * perPage, total)

  const resetToFirstPage = () => setPage(1)

  return (
    <div>
      <h2 className="mb-4 font-serif text-2xl font-bold text-ink-900">Пользователи</h2>

      <div className="mb-5 grid grid-cols-1 gap-3 rounded-card border border-ink-200 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Поиск"
          placeholder="Имя, @username или Telegram ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            resetToFirstPage()
          }}
        />
        <Select
          label="Роль"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as RoleFilter)
            resetToFirstPage()
          }}
        >
          <option value="all">Все роли</option>
          <option value="user">Пользователь</option>
          <option value="admin">Администратор</option>
        </Select>
        <Select
          label="Подписка"
          value={sub}
          onChange={(e) => {
            setSub(e.target.value as SubFilter)
            resetToFirstPage()
          }}
        >
          <option value="all">Любая</option>
          <option value="active">Активна</option>
          <option value="none">Нет / истекла</option>
        </Select>
        <Select
          label="Сортировка"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
        >
          <option value="created_desc">Сначала новые</option>
          <option value="created_asc">Сначала старые</option>
          <option value="name_asc">По имени (А-Я)</option>
        </Select>
      </div>

      {loading && <LoadingState label="Загрузка пользователей..." />}
      {error && <p className="text-sm text-danger-600">{error}</p>}

      {!loading && !error && (
        <>
          {users.length === 0 ? (
            <p className="rounded-card border border-dashed border-ink-300 py-10 text-center text-ink-500">
              Пользователи не найдены
            </p>
          ) : (
            <div className="overflow-x-auto rounded-card border border-ink-200 bg-white shadow-card">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-ink-500">
                    <th className="px-4 py-3 font-medium">Telegram</th>
                    <th className="px-4 py-3 font-medium">Имя</th>
                    <th className="px-4 py-3 font-medium">Роль</th>
                    <th className="px-4 py-3 font-medium">Регистрация</th>
                    <th className="px-4 py-3 font-medium">Подписка</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-ink-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-ink-900">{formatTelegramUser(u)}</td>
                      <td className="px-4 py-3 text-ink-600">{u.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === 'admin' ? 'brand' : 'neutral'}>
                          {u.role === 'admin' ? 'Админ' : 'Пользователь'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-ink-600">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <SubscriptionBadge activeUntil={u.subscription_active_until} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedUserId(u.id)}
                          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 hover:text-brand-700"
                        >
                          Подробнее
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-500">
              {total === 0 ? 'Нет результатов' : `Показано ${rangeStart}–${rangeEnd} из ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <Select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  resetToFirstPage()
                }}
                className="w-auto"
              >
                {PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} / стр.
                  </option>
                ))}
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Назад
              </Button>
              <span className="text-sm text-ink-600">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Вперёд
              </Button>
            </div>
          </div>
        </>
      )}

      {selectedUserId && (
        <div className="mt-6">
          <UserDetailPanel
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            onChanged={reload}
          />
        </div>
      )}
    </div>
  )
}
