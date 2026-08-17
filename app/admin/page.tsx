import { requireAdmin } from '@/lib/auth'
import { AdminLoginForm } from './AdminLoginForm'
import { AdminPanel } from './AdminPanel'

export default async function AdminPage() {
  const admin = await requireAdmin()

  if (!admin) {
    return <AdminLoginForm />
  }

  return <AdminPanel />
}
