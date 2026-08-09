export class DriveApiError extends Error {}

const ULTIMA_ATUALIZACAO_STORAGE = 'visita-obra:drive-ultima-atualizacao'

export function getUltimaAtualizacaoSalva(): string | null {
  return localStorage.getItem(ULTIMA_ATUALIZACAO_STORAGE)
}

export function salvarUltimaAtualizacao(iso: string): void {
  localStorage.setItem(ULTIMA_ATUALIZACAO_STORAGE, iso)
}

/**
 * Extrai o ID do arquivo a partir de um link do Google Drive/Sheets (em
 * qualquer um dos formatos comuns de compartilhamento, ou já o próprio ID).
 */
function extrairIdDrive(link: string): string | null {
  const texto = link.trim()
  const porCaminho = texto.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (porCaminho) return porCaminho[1]
  const porQuery = texto.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (porQuery) return porQuery[1]
  if (/^[a-zA-Z0-9_-]{15,}$/.test(texto)) return texto
  return null
}

/**
 * Busca o conteúdo de um arquivo público do Drive ("Qualquer pessoa com o
 * link") via Drive API v3 + chave de API (sem login/OAuth) e devolve um
 * File compatível com parseExcelFile, pra reaproveitar o mesmo parser.
 */
export async function buscarArquivoDrive(apiKey: string, linkOuId: string): Promise<File> {
  const chave = apiKey.trim()
  if (!chave) {
    throw new DriveApiError('Chave de API do Google não configurada.')
  }

  const id = extrairIdDrive(linkOuId)
  if (!id) {
    throw new DriveApiError('Link/ID do Drive não configurado corretamente.')
  }

  const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${encodeURIComponent(chave)}`

  let resposta: Response
  try {
    resposta = await fetch(url)
  } catch {
    throw new DriveApiError('Não consegui conectar ao Google Drive. Confira sua internet e tente de novo.')
  }

  if (!resposta.ok) {
    if (resposta.status === 403) {
      throw new DriveApiError(
        'Acesso negado pelo Drive (403). Confira se a chave de API continua válida e se o arquivo está compartilhado como "Qualquer pessoa com o link".'
      )
    }
    if (resposta.status === 404) {
      throw new DriveApiError('Arquivo não encontrado (404) no Drive.')
    }
    throw new DriveApiError(`O Drive respondeu com erro (${resposta.status}). Tente novamente.`)
  }

  const blob = await resposta.blob()
  return new File([blob], 'planilha-drive.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
