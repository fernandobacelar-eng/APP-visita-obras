import { jsPDF } from 'jspdf'
import type { ResumoPavimento, ResumoServico } from '../../db/repository'
import type { Visita, Foto } from '../../types'
import { STATUS_LABEL } from '../../lib/status'
import logoBtb from '../../assets/btb-logo.png'
import bannerPredio from '../../assets/villa-lobos-banner.jpg'

const PAGINA_LARGURA = 210
const PAGINA_ALTURA = 297
const MARGEM = 15
const LARGURA_UTIL = PAGINA_LARGURA - MARGEM * 2

async function urlParaDataUrl(url: string): Promise<string> {
  const resposta = await fetch(url)
  const blob = await resposta.blob()
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result as string)
    leitor.onerror = reject
    leitor.readAsDataURL(blob)
  })
}

// Reduz a foto pra um jpeg pequeno antes de embutir no PDF — a original em
// resolução cheia já fica salva separadamente no Drive.
function blobParaImagemReduzida(blob: Blob, larguraMaxPx: number): Promise<{ dataUrl: string; larguraMm: number; alturaMm: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const escala = Math.min(1, larguraMaxPx / img.naturalWidth)
      const larguraPx = Math.round(img.naturalWidth * escala)
      const alturaPx = Math.round(img.naturalHeight * escala)
      const canvas = document.createElement('canvas')
      canvas.width = larguraPx
      canvas.height = alturaPx
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas indisponível'))
        return
      }
      ctx.drawImage(img, 0, 0, larguraPx, alturaPx)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
      URL.revokeObjectURL(url)
      // 96px ~ 25.4mm (96 dpi), usado só como referência de tamanho no papel.
      const larguraMm = (larguraPx / 96) * 25.4
      const alturaMm = (alturaPx / 96) * 25.4
      resolve({ dataUrl, larguraMm, alturaMm })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível carregar a imagem'))
    }
    img.src = url
  })
}

class ConstrutorPdf {
  doc = new jsPDF({ unit: 'mm', format: 'a4' })
  y = MARGEM

  garantirEspaco(altura: number) {
    if (this.y + altura > PAGINA_ALTURA - MARGEM) {
      this.doc.addPage()
      this.y = MARGEM
    }
  }

  texto(txt: string, opts: { tamanho?: number; negrito?: boolean; cor?: [number, number, number]; espacoAntes?: number; espacoDepois?: number } = {}) {
    const { tamanho = 10, negrito = false, cor = [40, 40, 40], espacoAntes = 0, espacoDepois = 4 } = opts
    this.doc.setFont('helvetica', negrito ? 'bold' : 'normal')
    this.doc.setFontSize(tamanho)
    this.doc.setTextColor(...cor)
    const linhas = this.doc.splitTextToSize(txt, LARGURA_UTIL) as string[]
    this.y += espacoAntes
    this.garantirEspaco(linhas.length * (tamanho / 2.2) + espacoDepois)
    this.doc.text(linhas, MARGEM, this.y)
    this.y += linhas.length * (tamanho / 2.2) + espacoDepois
  }

  linha() {
    this.doc.setDrawColor(200, 200, 200)
    this.doc.line(MARGEM, this.y, PAGINA_LARGURA - MARGEM, this.y)
    this.y += 4
  }

  async imagens(fotos: Foto[]) {
    const LARGURA_CADA = (LARGURA_UTIL - 4) / 2
    let coluna = 0
    let yLinha = this.y
    let alturaMaximaLinha = 0
    for (const foto of fotos) {
      const { dataUrl, larguraMm, alturaMm } = await blobParaImagemReduzida(foto.blob, 500)
      const escala = Math.min(1, LARGURA_CADA / larguraMm)
      const w = larguraMm * escala
      const h = alturaMm * escala

      if (coluna === 0) {
        this.garantirEspaco(h + 10)
        yLinha = this.y
      }

      const x = MARGEM + coluna * (LARGURA_CADA + 4)
      this.doc.addImage(dataUrl, 'JPEG', x, yLinha, w, h)
      if (foto.legenda.trim()) {
        this.doc.setFont('helvetica', 'normal')
        this.doc.setFontSize(8)
        this.doc.setTextColor(100, 100, 100)
        const legendaLinhas = this.doc.splitTextToSize(foto.legenda, LARGURA_CADA) as string[]
        this.doc.text(legendaLinhas, x, yLinha + h + 3)
      }
      alturaMaximaLinha = Math.max(alturaMaximaLinha, h)

      coluna++
      if (coluna === 2) {
        coluna = 0
        this.y = yLinha + alturaMaximaLinha + 8
        alturaMaximaLinha = 0
      }
    }
    if (coluna !== 0) this.y = yLinha + alturaMaximaLinha + 8
  }
}

async function servicoTemConteudo(s: ResumoServico): Promise<boolean> {
  return (
    !!s.registro?.textoAnotacao.trim() ||
    s.fotos.length > 0 ||
    s.audios.length > 0 ||
    s.statusOriginal !== s.statusNormalizado
  )
}

export async function gerarRelatorioPdfBase64(visita: Visita, pavimentos: ResumoPavimento[]): Promise<string> {
  const c = new ConstrutorPdf()
  const doc = c.doc

  const [logoBtbDataUrl, bannerDataUrl] = await Promise.all([urlParaDataUrl(logoBtb), urlParaDataUrl(bannerPredio)])

  doc.addImage(bannerDataUrl, 'JPEG', MARGEM, c.y, LARGURA_UTIL, LARGURA_UTIL * (433 / 995))
  c.y += LARGURA_UTIL * (433 / 995) + 6

  doc.addImage(logoBtbDataUrl, 'PNG', MARGEM, c.y, 28, 28 * (187 / 524))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(18, 42, 82)
  doc.text(visita.obraNome, MARGEM + 34, c.y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90, 90, 90)
  const dataVistoria = new Date(visita.dataVisita).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  doc.text(`Vistoria em ${dataVistoria}`, MARGEM + 34, c.y + 12)
  c.y += 28 * (187 / 524) + 6
  c.linha()

  for (const pav of pavimentos) {
    const servicosComConteudo: ResumoServico[] = []
    for (const s of pav.servicos) {
      if (await servicoTemConteudo(s)) servicosComConteudo.push(s)
    }
    const temAnotacaoGeral =
      !!pav.registroGeral?.textoAnotacao.trim() || pav.fotosGerais.length > 0 || pav.audiosGerais.length > 0
    if (servicosComConteudo.length === 0 && !temAnotacaoGeral) continue

    c.garantirEspaco(10)
    c.texto(pav.nome, { tamanho: 14, negrito: true, cor: [18, 42, 82], espacoAntes: 2, espacoDepois: 3 })

    if (temAnotacaoGeral) {
      c.texto('Anotações gerais do pavimento', { tamanho: 10, negrito: true, cor: [27, 58, 107] })
      if (pav.registroGeral?.textoAnotacao.trim()) {
        c.texto(pav.registroGeral.textoAnotacao, { tamanho: 10 })
      }
      for (const a of pav.audiosGerais) {
        if (a.transcricao) c.texto(`Áudio: "${a.transcricao}"`, { tamanho: 9, cor: [100, 100, 100] })
      }
      await c.imagens(pav.fotosGerais)
      c.y += 2
    }

    for (const s of servicosComConteudo) {
      c.garantirEspaco(12)
      c.texto(`${s.nome}  —  ${STATUS_LABEL[s.statusNormalizado]}`, { tamanho: 11, negrito: true, espacoDepois: 1 })
      if (s.statusOriginal !== s.statusNormalizado) {
        c.texto(`Status alterado nesta visita: ${STATUS_LABEL[s.statusOriginal]} -> ${STATUS_LABEL[s.statusNormalizado]}`, {
          tamanho: 9,
          negrito: true,
          cor: [27, 58, 107],
        })
      }
      if (s.registro?.textoAnotacao.trim()) {
        c.texto(s.registro.textoAnotacao, { tamanho: 10 })
      }
      for (const a of s.audios) {
        if (a.transcricao) c.texto(`Áudio: "${a.transcricao}"`, { tamanho: 9, cor: [100, 100, 100] })
      }
      await c.imagens(s.fotos)
      c.y += 3
    }
    c.linha()
  }

  const dataUri = doc.output('datauristring')
  return dataUri.slice(dataUri.indexOf(',') + 1)
}
