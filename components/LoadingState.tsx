export function LoadingState({ label = 'Загрузка...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink-500" role="status">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-ink-200 border-t-brand-500" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
