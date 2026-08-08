import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import btbMark from '../assets/btb-mark.svg'

export function TopBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string
  subtitle?: string
  onBack?: boolean | (() => void)
  right?: ReactNode
}) {
  const navigate = useNavigate()

  function handleBack() {
    if (typeof onBack === 'function') {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <header className="safe-top sticky top-0 z-10 flex items-center gap-3 bg-brand px-4 py-3 text-white shadow-md">
      {onBack && (
        <button
          onClick={handleBack}
          aria-label="Voltar"
          className="-ml-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl active:bg-white/15"
        >
          ←
        </button>
      )}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
        <img src={btbMark} alt="BTB" className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-white/80">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}
