/**
 * Extrai o ID do arquivo a partir de um link do Google Drive/Sheets colado
 * pelo usuário, em qualquer um dos formatos comuns de compartilhamento.
 */
export function extrairIdDrive(link: string): string | null {
  const texto = link.trim()
  const porCaminho = texto.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (porCaminho) return porCaminho[1]
  const porQuery = texto.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (porQuery) return porQuery[1]
  // Talvez o usuário já tenha colado só o ID
  if (/^[a-zA-Z0-9_-]{15,}$/.test(texto)) return texto
  return null
}

/**
 * Monta a URL de download direto do arquivo original (sem passar pelo
 * conversor do Google Sheets, que poderia alterar a formatação/cores das
 * células de que o parser depende). Só funciona para arquivos compartilhados
 * como "Qualquer pessoa com o link".
 */
export function montarUrlDownloadDrive(idOuLink: string): string | null {
  const id = extrairIdDrive(idOuLink)
  if (!id) return null
  return `https://drive.google.com/uc?export=download&id=${id}`
}
