import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
      <p className="text-lg font-semibold text-gray-700">{title}</p>
      {description && <p className="text-base text-gray-500">{description}</p>}
      {action}
    </div>
  )
}
