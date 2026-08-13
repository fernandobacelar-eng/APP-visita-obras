import { getVisita, getResumoVisita } from '../../db/repository'
import type { Foto, Audio } from '../../types'
import { gerarRelatorioXlsxBase64 } from './relatorioXlsx'

// Embutidos no build via .env.local (não versionado) — mesmo esquema da
// chave do Drive: nunca comitados no repositório público.
const SYNC_URL = import.meta.env.VITE_DRIVE_SYNC_URL ?? ''
const SYNC_SECRET = import.meta.env.VITE_DRIVE_SYNC_SECRET ?? ''

export class DriveSyncError extends Error {}

const ENVIADOS_STORAGE = 'visita-obra:drive-sync-enviados'
const ULTIMA_SYNC_STORAGE_PREFIXO = 'visita-obra:drive-sync-ultima:'

function getEnviados(): Set<string> {
  try {
    const raw = localStorage.getItem(ENVIADOS_STORAGE)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function salvarEnviados(set: Set<string>): void {
  localStorage.setItem(ENVIADOS_STORAGE, JSON.stringify([...set]))
}

export function getUltimaSincronizacao(visitaId: number): string | null {
  return localStorage.getItem(ULTIMA_SYNC_STORAGE_PREFIXO + visitaId)
}

function salvarUltimaSincronizacao(visitaId: number, iso: string): void {
  localStorage.setItem(ULTIMA_SYNC_STORAGE_PREFIXO + visitaId, iso)
}

function sanitizarNomeArquivo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim()
    .slice(0, 80)
}

const EXTENSAO_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
}

function extensaoPara(mime: string): string {
  return EXTENSAO_POR_MIME[mime] ?? 'bin'
}

async function blobParaBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binario = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binario += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binario)
}

interface ArquivoPayload {
  nome: string
  mime: string
  legenda?: string
  base64?: string
}

// Só reenvia o conteúdo (base64) de fotos/áudios que este navegador ainda
// não mandou pro Drive — evita gastar dados móveis reenviando tudo de novo
// a cada sincronização. O servidor também ignora nomes que já existem na
// pasta, então isso nunca causa duplicata mesmo sincronizando de outro
// aparelho.
async function montarArquivo(
  prefixo: string,
  tipo: 'foto' | 'audio',
  item: Foto | Audio,
  legenda: string | undefined,
  enviados: Set<string>,
  chavesNovas: string[]
): Promise<ArquivoPayload> {
  const chave = `${tipo}-${item.id}`
  const mime = item.blob.type || (tipo === 'foto' ? 'image/jpeg' : 'audio/webm')
  const nome = `${prefixo} - ${chave}.${extensaoPara(mime)}`
  const jaEnviado = enviados.has(chave)
  if (!jaEnviado) chavesNovas.push(chave)
  return {
    nome,
    mime,
    legenda,
    base64: jaEnviado ? undefined : await blobParaBase64(item.blob),
  }
}

export async function sincronizarVisita(
  visitaId: number
): Promise<{ pastaUrl?: string; arquivosSalvos: number }> {
  if (!SYNC_URL || !SYNC_SECRET) {
    throw new DriveSyncError('Sincronização com o Drive não está configurada.')
  }

  const visita = await getVisita(visitaId)
  if (!visita) {
    throw new DriveSyncError('Visita não encontrada.')
  }

  const pavimentos = await getResumoVisita(visitaId)
  const enviados = getEnviados()
  const chavesNovas: string[] = []

  const pavimentosPayload = []
  for (const pav of pavimentos) {
    const prefixoPav = sanitizarNomeArquivo(pav.nome)

    const fotosGerais: ArquivoPayload[] = []
    for (const f of pav.fotosGerais) {
      fotosGerais.push(await montarArquivo(`${prefixoPav} - Geral`, 'foto', f, f.legenda, enviados, chavesNovas))
    }
    const audiosGerais: ArquivoPayload[] = []
    for (const a of pav.audiosGerais) {
      audiosGerais.push(
        await montarArquivo(`${prefixoPav} - Geral`, 'audio', a, a.transcricao ?? undefined, enviados, chavesNovas)
      )
    }

    const servicosPayload = []
    for (const s of pav.servicos) {
      const prefixoServ = `${prefixoPav} - ${sanitizarNomeArquivo(s.nome)}`

      const fotos: ArquivoPayload[] = []
      for (const f of s.fotos) {
        fotos.push(await montarArquivo(prefixoServ, 'foto', f, f.legenda, enviados, chavesNovas))
      }
      const audios: ArquivoPayload[] = []
      for (const a of s.audios) {
        audios.push(await montarArquivo(prefixoServ, 'audio', a, a.transcricao ?? undefined, enviados, chavesNovas))
      }

      servicosPayload.push({
        nome: s.nome,
        statusOriginal: s.statusOriginal,
        statusAtual: s.statusNormalizado,
        texto: s.registro?.textoAnotacao ?? '',
        fotos,
        audios,
      })
    }

    pavimentosPayload.push({
      nome: pav.nome,
      anotacaoGeral: {
        texto: pav.registroGeral?.textoAnotacao ?? '',
        fotos: fotosGerais,
        audios: audiosGerais,
      },
      servicos: servicosPayload,
    })
  }

  const payload = {
    secret: SYNC_SECRET,
    visitaId,
    obraNome: visita.obraNome,
    dataVisita: visita.dataVisita,
    status: visita.status,
    pavimentos: pavimentosPayload,
    // Planilha pronta pra abrir direto no Drive/Excel, além do JSON bruto —
    // sempre reenviada (é pequena, só texto), sempre substitui a anterior.
    relatorioXlsxBase64: gerarRelatorioXlsxBase64(visita, pavimentos),
  }

  let resposta: Response
  try {
    resposta = await fetch(SYNC_URL, {
      method: 'POST',
      // text/plain evita o preflight de CORS (Apps Script não responde
      // OPTIONS) — o conteúdo continua sendo JSON, só o header muda.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new DriveSyncError('Não consegui conectar ao Drive. Confira sua internet e tente de novo.')
  }

  if (!resposta.ok) {
    throw new DriveSyncError(`O servidor respondeu com erro (${resposta.status}).`)
  }

  const json = await resposta.json()
  if (!json.ok) {
    throw new DriveSyncError(json.error || 'Não foi possível sincronizar agora.')
  }

  chavesNovas.forEach((c) => enviados.add(c))
  salvarEnviados(enviados)
  salvarUltimaSincronizacao(visitaId, new Date().toISOString())

  return { pastaUrl: json.pastaUrl, arquivosSalvos: json.arquivosSalvos ?? 0 }
}
