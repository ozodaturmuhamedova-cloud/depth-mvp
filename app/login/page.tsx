import { Suspense } from 'react'
import { redirectIfAuthenticated } from '@/lib/dal'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  // Достоверная (не только по Proxy) проверка на сервере — авторизованный
  // пользователь не должен видеть форму входа.
  await redirectIfAuthenticated()

  return (
    // useSearchParams (для ?next=) требует границы Suspense в App Router.
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
