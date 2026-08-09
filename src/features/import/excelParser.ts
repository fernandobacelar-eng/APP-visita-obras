import * as XLSX from 'xlsx'
import type { ImportPreview, StatusServico } from '../../types'

export interface ParsedServico {
  nome: string
  /** Texto bruto da célula ("EXECUÇÃO", "RABO" ou vazio) */
  status: string
  statusNormalizado: StatusServico
}

export interface ParsedPavimento {
  nome: string
  servicos: ParsedServico[]
}

export interface ParseResult {
  pavimentos: ParsedPavimento[]
  preview: ImportPreview
}

export class ExcelParseError extends Error {}

const COL_PAVIMENTO = 1 // coluna B (0-indexed)
const COL_SERVICO_INICIO = 2 // coluna C

function normalizarTexto(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function textoCelula(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v == null) return ''
  return String(cell.v).trim()
}

function celulaPreenchida(cell: XLSX.CellObject | undefined): boolean {
  const pattern = (cell as { s?: { patternType?: string } } | undefined)?.s?.patternType
  return !!pattern && pattern !== 'none'
}

/**
 * Painel de curva física: cada coluna (a partir de C, cabeçalho na linha 3) é um serviço,
 * cada linha (coluna B) é um pavimento. Todo pavimento nomeado na coluna B e todo serviço
 * nomeado na linha 3 entram no app, mesmo que ainda não tenha nenhuma marcação — uma célula
 * sem preenchimento e sem texto quer dizer "ainda não começou", não "nunca vai acontecer".
 * Dentro de cada coluna, a célula com o texto "EXECUÇÃO" marca a frente de execução atual;
 * "RABO" marca pendência; qualquer outra célula preenchida já foi alcançada por essa frente
 * (concluída). A posição da linha não é usada pra decidir status: cada serviço avança numa
 * direção diferente pela torre (uns de baixo pra cima, outros do topo pro térreo), então só
 * o preenchimento em si é um sinal confiável.
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellStyles: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new ExcelParseError('A planilha está vazia.')
  }
  const sheet = workbook.Sheets[sheetName]
  const ref = sheet['!ref']
  if (!ref) {
    throw new ExcelParseError('A planilha está vazia.')
  }
  const range = XLSX.utils.decode_range(ref)

  let headerRow = -1
  for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
    let count = 0
    for (let c = COL_SERVICO_INICIO; c <= range.e.c; c++) {
      if (textoCelula(sheet[XLSX.utils.encode_cell({ r, c })])) count++
    }
    if (count >= 2) {
      headerRow = r
      break
    }
  }
  if (headerRow === -1) {
    throw new ExcelParseError(
      'Não encontrei a linha com os nomes dos serviços (esperada a partir da coluna C). Confira se é o arquivo certo.'
    )
  }

  const colunasServico: { col: number; nome: string }[] = []
  for (let c = COL_SERVICO_INICIO; c <= range.e.c; c++) {
    const texto = textoCelula(sheet[XLSX.utils.encode_cell({ r: headerRow, c })])
    if (texto) {
      colunasServico.push({ col: c, nome: texto.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim() })
    }
  }
  if (colunasServico.length === 0) {
    throw new ExcelParseError('Não encontrei serviços na linha de cabeçalho. Confira se é o arquivo certo.')
  }

  const linhasPavimento: { row: number; nome: string }[] = []
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const texto = textoCelula(sheet[XLSX.utils.encode_cell({ r, c: COL_PAVIMENTO })])
    if (!texto) break
    linhasPavimento.push({ row: r, nome: texto })
  }
  if (linhasPavimento.length === 0) {
    throw new ExcelParseError('Não encontrei pavimentos na coluna B da planilha. Confira se é o arquivo certo.')
  }

  const grid = colunasServico.map(({ col }) =>
    linhasPavimento.map(({ row }) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })]
      const texto = textoCelula(cell)
      return { aplicavel: celulaPreenchida(cell) || !!texto, texto }
    })
  )

  // A ordem das linhas (de cima/cobertura pra baixo/térreo ou o contrário)
  // varia por serviço — cada frente de obra avança numa direção diferente —
  // então a posição relativa à célula "EXECUÇÃO" não é um sinal confiável de
  // status. O sinal confiável é o próprio preenchimento: se alguém coloriu a
  // célula (sem ser a frente ou uma pendência), aquele pavimento já foi
  // alcançado por essa frente de serviço. Uma célula sem preenchimento e sem
  // texto significa que esse serviço ainda não começou ali (não que ele não
  // vá acontecer) — por isso todo pavimento da coluna B e todo serviço da
  // linha 3 sempre entram no app, mesmo sem nenhuma marcação ainda.
  const statusPorColuna: StatusServico[][] = grid.map((linhas) =>
    linhas.map((info): StatusServico => {
      const t = normalizarTexto(info.texto)
      if (t.includes('execu')) return 'em_execucao'
      if (t === 'rabo') return 'pendencia'
      if (!info.aplicavel) return 'nao_iniciado'
      return 'concluido'
    })
  )

  const pavimentos: ParsedPavimento[] = linhasPavimento.map((p, rowIdx) => {
    const servicos: ParsedServico[] = colunasServico.map((s, colIdx) => {
      const info = grid[colIdx][rowIdx]
      return {
        nome: s.nome,
        status: info.texto,
        statusNormalizado: statusPorColuna[colIdx][rowIdx],
      }
    })
    return { nome: p.nome, servicos }
  })

  const preview: ImportPreview = {
    pavimentos: pavimentos.map((p) => ({ nome: p.nome, servicos: p.servicos.length })),
    totalServicos: pavimentos.reduce((acc, p) => acc + p.servicos.length, 0),
    avisos: [],
  }

  return { pavimentos, preview }
}
