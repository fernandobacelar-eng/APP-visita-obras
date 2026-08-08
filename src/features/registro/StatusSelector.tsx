import type { StatusServico } from '../../types'
import { STATUS_LABEL, STATUS_CLASSES } from '../../lib/status'

const OPCOES: StatusServico[] = ['nao_iniciado', 'em_execucao', 'concluido', 'pendencia']

export function StatusSelector({
  status,
  onChange,
}: {
  status: StatusServico
  onChange: (novoStatus: StatusServico) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPCOES.map((opcao) => (
        <button
          key={opcao}
          onClick={() => onChange(opcao)}
          className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${
            status === opcao ? STATUS_CLASSES[opcao] : 'border-gray-300 bg-white text-gray-500 active:bg-gray-50'
          }`}
        >
          {STATUS_LABEL[opcao]}
        </button>
      ))}
    </div>
  )
}
