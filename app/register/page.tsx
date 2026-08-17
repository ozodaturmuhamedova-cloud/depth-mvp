import { redirectIfAuthenticated } from '@/lib/dal'
import { RegisterForm } from './RegisterForm'

export default async function RegisterPage() {
  // Достоверная (не только по Proxy) проверка на сервере — авторизованный
  // пользователь не должен видеть форму регистрации.
  await redirectIfAuthenticated()

  return <RegisterForm />
}
