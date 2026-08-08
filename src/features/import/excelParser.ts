import * as XLSX from 'xlsx'
import { normalizarStatus } from '../../lib/status'
import type { ImportPreview, StatusServico } from '../../types'

export interface ParsedServico {
  nome: string
  status: string
  statusNormalizado: StatusServico
  observacao?: string
}

export interface ParsedPavimento {
  nome: string
  servicos: ParsedServico[]
}

export interface ParseResult {
  pavimentos: ParsedPavimento[]
  preview: ImportPreview
}

type Campo = 'pavimento' | 'servico' | 'status' | 'observacao'

const ALIASES: Record<Campo, string[]> = {
  pavimento: ['pavimento', 'andar', 'nivel', 'piso'],
  servico: ['servico', 'atividade', 'tarefa'],
  status: ['status', 'situacao'],
  observacao: ['observacao', 'obs', 'nota', 'anotacao'],
}

function normalizarTexto(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function encontrarColunas(header: unknown[]): Partial<Record<Campo, number>> {
  const resultado: Partial<Record<Campo, number>> = {}
  header.forEach((cell, idx) => {
    const texto = normalizarTexto(cell)
    if (!texto) return
    for (const campo of Object.keys(ALIASES) as Campo[]) {
      if (resultado[campo] != null) continue
      if (ALIASES[campo].some((alias) => texto === alias || texto.startsWith(alias))) {
        resultado[campo] = idx
      }
    }
  })
  return resultado
}

export class ExcelParseError extends Error {}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new ExcelParseError('A planilha está vazia.')
  }
  const sheet = workbook.Sheets[sheetName]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  })

  let headerIdx = -1
  let colunas: Partial<Record<Campo, number>> = {}
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const encontradas = encontrarColunas(rows[i])
    if (encontradas.pavimento != null && encontradas.servico != null && encontradas.status != null) {
      headerIdx = i
      colunas = encontradas
      break
    }
  }

  if (headerIdx === -1) {
    throw new ExcelParseError(
      'Não encontrei as colunas "Pavimento", "Serviço" e "Status" na planilha. Baixe o modelo e preencha nesse formato.'
    )
  }

  const avisos: string[] = []
  const pavimentosMap = new Map<string, ParsedPavimento>()

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    const pavimentoNome = String(row[colunas.pavimento!] ?? '').trim()
    const servicoNome = String(row[colunas.servico!] ?? '').trim()
    const statusBruto = String(row[colunas.status!] ?? '').trim()
    const observacao = colunas.observacao != null ? String(row[colunas.observacao] ?? '').trim() : undefined

    if (!pavimentoNome && !servicoNome) continue
    if (!pavimentoNome || !servicoNome) {
      avisos.push(`Linha ${i + 1}: pavimento ou serviço em branco — ignorada.`)
      continue
    }

    if (!pavimentosMap.has(pavimentoNome)) {
      pavimentosMap.set(pavimentoNome, { nome: pavimentoNome, servicos: [] })
    }
    pavimentosMap.get(pavimentoNome)!.servicos.push({
      nome: servicoNome,
      status: statusBruto,
      statusNormalizado: normalizarStatus(statusBruto),
      observacao: observacao || undefined,
    })
  }

  const pavimentos = Array.from(pavimentosMap.values())
  if (pavimentos.length === 0) {
    throw new ExcelParseError('Nenhuma linha válida encontrada na planilha.')
  }

  const preview: ImportPreview = {
    pavimentos: pavimentos.map((p) => ({ nome: p.nome, servicos: p.servicos.length })),
    totalServicos: pavimentos.reduce((acc, p) => acc + p.servicos.length, 0),
    avisos,
  }

  return { pavimentos, preview }
}
