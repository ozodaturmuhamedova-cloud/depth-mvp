import { requireAdminOrNotFound } from '@/lib/dal'
import { AdminPanel } from './AdminPanel'

export default async function AdminPage() {
  // Гость и обычный пользователь получают 404 — панель для них как будто
  // не существует, вместо подсказки в виде отдельной формы входа.
  await requireAdminOrNotFound()

  return <AdminPanel />
}
