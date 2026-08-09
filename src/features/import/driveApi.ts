export class DriveApiError extends Error {}

const CHAVE_STORAGE = 'visita-obra:drive-api-key'
const LINK_STORAGE = 'visita-obra:drive-link'

export function getDriveApiKeySalva(): string {
  return localStorage.getItem(CHAVE_STORAGE) ?? ''
}

export function salvarDriveApiKey(valor: string): void {
  localStorage.setItem(CHAVE_STORAGE, valor)
}

export function getDriveLinkSalvo(): string {
  return localStorage.getItem(LINK_STORAGE) ?? ''
}

export function salvarDriveLink(valor: string): void {
  localStorage.setItem(LINK_STORAGE, valor)
}

/**
 * Extrai o ID do arquivo a partir de um link do Google Drive/Sheets colado
 * pelo usuário, em qualquer um dos formatos comuns de compartilhamento (ou
 * já o próprio ID, se for isso que foi colado).
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
 * File compatível com parseExcelFile, pra reaproveitar o mesmo parser da
 * importação manual.
 */
export async function buscarArquivoDrive(apiKey: string, linkOuId: string): Promise<File> {
  const chave = apiKey.trim()
  if (!chave) {
    throw new DriveApiError('Preencha a chave de API do Google antes de buscar.')
  }

  const id = extrairIdDrive(linkOuId)
  if (!id) {
    throw new DriveApiError('Não reconheci esse link/ID do Drive. Cole o link de compartilhamento completo.')
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
        'Acesso negado pelo Drive (403). Confira se a chave de API está certa, se a Drive API está ativada no seu projeto Google Cloud, e se o arquivo está compartilhado como "Qualquer pessoa com o link".'
      )
    }
    if (resposta.status === 404) {
      throw new DriveApiError('Arquivo não encontrado (404). Confira o link/ID colado.')
    }
    throw new DriveApiError(`O Drive respondeu com erro (${resposta.status}). Tente novamente.`)
  }

  const blob = await resposta.blob()
  return new File([blob], 'planilha-drive.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
