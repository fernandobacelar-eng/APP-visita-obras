import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TopBar } from '../../components/TopBar'
import { Card } from '../../components/Card'
import {
  getServico,
  getPavimento,
  getOuCriarRegistro,
  atualizarRegistro,
  atualizarStatusServico,
  getFotos,
  adicionarFoto,
  removerFoto,
  atualizarLegendaFoto,
  getAudios,
  adicionarAudio,
  removerAudio,
} from '../../db/repository'
import type {
  Servico,
  Pavimento,
  Registro,
  Foto,
  Audio as AudioRegistro,
  StatusTranscricao,
  StatusServico,
} from '../../types'
import { FotoCapture } from './FotoCapture'
import { AnotacaoTexto } from './AnotacaoTexto'
import { AnotacaoVoz } from './AnotacaoVoz'
import { QdpPlaceholder } from './QdpPlaceholder'
import { StatusSelector } from './StatusSelector'

export function RegistroServico() {
  const { servicoId } = useParams<{ servicoId: string }>()
  const id = Number(servicoId)

  const [servico, setServico] = useState<Servico | null>(null)
  const [pavimento, setPavimento] = useState<Pavimento | null>(null)
  const [registro, setRegistro] = useState<Registro | null>(null)
  const [fotos, setFotos] = useState<Foto[]>([])
  const [audios, setAudios] = useState<AudioRegistro[]>([])
  const [texto, setTexto] = useState('')
  const [qdp, setQdp] = useState('')
  const [salvo, setSalvo] = useState(true)

  const textoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function carregar() {
      if (!id) return
      const s = await getServico(id)
      if (!s) return
      setServico(s)
      const [p, reg] = await Promise.all([getPavimento(s.pavimentoId), getOuCriarRegistro(id)])
      setPavimento(p ?? null)
      setRegistro(reg)
      setTexto(reg.textoAnotacao)
      setQdp(reg.qdpPlaceholder)
      const [f, a] = await Promise.all([getFotos(reg.id), getAudios(reg.id)])
      setFotos(f)
      setAudios(a)
    }
    carregar()
  }, [id])

  const salvarCampos = useCallback(
    (campos: Partial<Pick<Registro, 'textoAnotacao' | 'qdpPlaceholder'>>) => {
      if (!registro?.id) return
      setSalvo(false)
      atualizarRegistro(registro.id, campos).then(() => setSalvo(true))
    },
    [registro]
  )

  function handleTextoChange(novoTexto: string) {
    setTexto(novoTexto)
    if (textoTimer.current) clearTimeout(textoTimer.current)
    textoTimer.current = setTimeout(() => salvarCampos({ textoAnotacao: novoTexto }), 500)
  }

  function handleQdpChange(novoTexto: string) {
    setQdp(novoTexto)
    if (textoTimer.current) clearTimeout(textoTimer.current)
    textoTimer.current = setTimeout(() => salvarCampos({ qdpPlaceholder: novoTexto }), 500)
  }

  async function handleAdicionarFotos(files: FileList) {
    if (!registro?.id) return
    for (const file of Array.from(files)) {
      await adicionarFoto(registro.id, file)
    }
    setFotos(await getFotos(registro.id))
  }

  async function handleRemoverFoto(fotoId: number) {
    await removerFoto(fotoId)
    if (registro?.id) setFotos(await getFotos(registro.id))
  }

  async function handleLegendaChange(fotoId: number, legenda: string) {
    await atualizarLegendaFoto(fotoId, legenda)
    setFotos((atual) => atual.map((f) => (f.id === fotoId ? { ...f, legenda } : f)))
  }

  async function handleGravado(blob: Blob, transcricao: string | null, status: StatusTranscricao) {
    if (!registro?.id) return
    await adicionarAudio(registro.id, blob, transcricao, status)
    setAudios(await getAudios(registro.id))
  }

  async function handleRemoverAudio(audioId: number) {
    await removerAudio(audioId)
    if (registro?.id) setAudios(await getAudios(registro.id))
  }

  async function handleStatusChange(novoStatus: StatusServico) {
    if (!servico) return
    setServico({ ...servico, statusNormalizado: novoStatus })
    await atualizarStatusServico(servico.id, novoStatus)
  }

  if (!servico || !registro) return null

  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <TopBar title={servico.nome} subtitle={pavimento?.nome} onBack />

      <main className="flex-1 space-y-4 p-4 pb-10">
        <div className="flex justify-end">
          <span className="text-xs text-gray-400">{salvo ? 'Salvo' : 'Salvando…'}</span>
        </div>

        {servico.observacaoImportada && (
          <p className="text-sm text-gray-500">{servico.observacaoImportada}</p>
        )}

        <Card>
          <h2 className="mb-3 text-lg font-bold text-brand-dark">Status</h2>
          <StatusSelector status={servico.statusNormalizado} onChange={handleStatusChange} />
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold text-brand-dark">Fotos</h2>
          <FotoCapture
            fotos={fotos}
            onAdicionar={handleAdicionarFotos}
            onRemover={handleRemoverFoto}
            onLegendaChange={handleLegendaChange}
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold text-brand-dark">Anotação</h2>
          <AnotacaoTexto valor={texto} onChange={handleTextoChange} />
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold text-brand-dark">Anotação por voz</h2>
          <AnotacaoVoz audios={audios} onGravado={handleGravado} onRemover={handleRemoverAudio} />
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold text-brand-dark">Verificação QDP</h2>
          <QdpPlaceholder valor={qdp} onChange={handleQdpChange} />
        </Card>
      </main>
    </div>
  )
}
