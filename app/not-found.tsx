import { ButtonLink } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="font-serif text-5xl font-bold text-ink-900">404</p>
      <h1 className="font-serif text-2xl font-bold text-ink-900">Страница не найдена</h1>
      <p className="max-w-md text-ink-500">
        Страница, которую вы ищете, не существует или была перемещена.
      </p>
      <ButtonLink href="/">На главную</ButtonLink>
    </div>
  )
}
