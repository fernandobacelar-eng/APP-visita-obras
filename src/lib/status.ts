import type { StatusServico } from '../types'

export const STATUS_LABEL: Record<StatusServico, string> = {
  nao_iniciado: 'Não iniciado',
  em_execucao: 'Em execução',
  concluido: 'Concluído',
  pendencia: 'Pendência',
  outro: 'Outro',
}

export const STATUS_CLASSES: Record<StatusServico, string> = {
  nao_iniciado: 'bg-gray-200 text-gray-700 border-gray-400',
  em_execucao: 'bg-status-em-execucao/15 text-status-em-execucao border-status-em-execucao',
  concluido: 'bg-status-concluido/15 text-status-concluido border-status-concluido',
  pendencia: 'bg-status-pendencia/15 text-status-pendencia border-status-pendencia',
  outro: 'bg-gray-100 text-gray-600 border-gray-400',
}
