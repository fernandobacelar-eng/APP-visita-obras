import * as XLSX from 'xlsx'
import type { ResumoPavimento } from '../../db/repository'
import type { Visita } from '../../types'
import { STATUS_LABEL } from '../../lib/status'

/** Gera o relatório da visita como planilha .xlsx (base64), pra ficar acessível
 * no Drive sem precisar do app — uma linha por serviço, com status e anotações. */
export function gerarRelatorioXlsxBase64(visita: Visita, pavimentos: ResumoPavimento[]): string {
  const linhas: (string | number)[][] = [
    ['Obra', visita.obraNome],
    ['Data da vistoria', new Date(visita.dataVisita).toLocaleString('pt-BR')],
    [],
    [
      'Pavimento',
      'Serviço',
      'Status original',
      'Status atual',
      'Mudou nesta visita?',
      'Anotação',
      'Legendas das fotos',
      'Transcrição do áudio',
    ],
  ]

  for (const pav of pavimentos) {
    const temAnotacaoGeral =
      !!pav.registroGeral?.textoAnotacao.trim() || pav.fotosGerais.length > 0 || pav.audiosGerais.length > 0
    if (temAnotacaoGeral) {
      linhas.push([
        pav.nome,
        'Anotações gerais do pavimento',
        '',
        '',
        '',
        pav.registroGeral?.textoAnotacao ?? '',
        pav.fotosGerais.map((f) => f.legenda).filter(Boolean).join(' | '),
        pav.audiosGerais.map((a) => a.transcricao).filter(Boolean).join(' | '),
      ])
    }

    for (const s of pav.servicos) {
      linhas.push([
        pav.nome,
        s.nome,
        STATUS_LABEL[s.statusOriginal],
        STATUS_LABEL[s.statusNormalizado],
        s.statusOriginal !== s.statusNormalizado ? 'Sim' : 'Não',
        s.registro?.textoAnotacao ?? '',
        s.fotos.map((f) => f.legenda).filter(Boolean).join(' | '),
        s.audios.map((a) => a.transcricao).filter(Boolean).join(' | '),
      ])
    }
  }

  const planilha = XLSX.utils.aoa_to_sheet(linhas)
  planilha['!cols'] = [
    { wch: 12 },
    { wch: 26 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 40 },
    { wch: 30 },
    { wch: 30 },
  ]

  const livro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(livro, planilha, 'Vistoria')
  return XLSX.write(livro, { type: 'base64', bookType: 'xlsx' })
}
