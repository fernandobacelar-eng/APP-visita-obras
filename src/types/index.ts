export type StatusServico =
  | 'nao_iniciado'
  | 'em_execucao'
  | 'concluido'
  | 'pendencia'
  | 'outro'

export interface Visita {
  id: number
  obraNome: string
  dataImportacao: string
  dataVisita: string
  status: 'em_andamento' | 'finalizada'
}

export interface Pavimento {
  id: number
  visitaId: number
  nome: string
  ordem: number
}

export interface Servico {
  id: number
  pavimentoId: number
  nome: string
  /** Texto bruto de status como veio da planilha (ex: "Em execução") */
  statusImportado: string
  /** Status normalizado para exibição de badge/filtro */
  statusNormalizado: StatusServico
  observacaoImportada?: string
  ordem: number
}

export interface Registro {
  id: number
  /** Presente quando o registro é de um serviço específico */
  servicoId?: number
  /** Presente quando o registro é das anotações gerais de um pavimento */
  pavimentoId?: number
  criadoEm: string
  atualizadoEm: string
  textoAnotacao: string
  /** Campo reservado para a futura "Verificação QDP" — sem lógica na v1 (só se aplica a registros de serviço) */
  qdpPlaceholder: string
}

export interface Foto {
  id: number
  registroId: number
  blob: Blob
  criadoEm: string
}

export type StatusTranscricao = 'transcrito' | 'pendente' | 'nao_aplicavel'

export interface Audio {
  id: number
  registroId: number
  blob: Blob
  transcricao: string | null
  statusTranscricao: StatusTranscricao
  criadoEm: string
}

export interface ImportPreview {
  pavimentos: { nome: string; servicos: number }[]
  totalServicos: number
  avisos: string[]
}
