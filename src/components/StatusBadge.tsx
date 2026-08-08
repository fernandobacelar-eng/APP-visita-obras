import type { StatusServico } from '../types'
import { STATUS_LABEL, STATUS_CLASSES } from '../lib/status'

export function StatusBadge({ status }: { status: StatusServico }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
