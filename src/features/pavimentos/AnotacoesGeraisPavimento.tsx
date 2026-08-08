import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TopBar } from '../../components/TopBar'
import { Card } from '../../components/Card'
import {
  getPavimento,
  getOuCriarRegistroPavimento,
  atualizarRegistro,
  getFotos,
  adicionarFoto,
  removerFoto,
  atualizarLegendaFoto,
  getAudios,
  adicionarAudio,
  removerAudio,
} from '../../db/repository'
import type { Pavimento, Registro, Foto, Audio as AudioRegistro, StatusTranscricao } from '../../types'
import { FotoCapture } from '../registro/FotoCapture'
import { AnotacaoTexto } from '../registro/AnotacaoTexto'
import { AnotacaoVoz } from '../registro/AnotacaoVoz'

export function AnotacoesGeraisPavimento() {
  const { pavimentoId } = useParams<{ pavimentoId: string }>()
  const id = Number(pavimentoId)

  const [pavimento, setPavimento] = useState<Pavimento | null>(null)
  const [registro, setRegistro] = useState<Registro | null>(null)
  const [fotos, setFotos] = useState<Foto[]>([])
  const [audios, setAudios] = useState<AudioRegistro[]>([])
  const [texto, setTexto] = useState('')
  const [salvo, setSalvo] = useState(true)

  const textoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function carregar() {
      if (!id) return
      const p = await getPavimento(id)
      if (!p) return
      setPavimento(p)
      const reg = await getOuCriarRegistroPavimento(id)
      setRegistro(reg)
      setTexto(reg.textoAnotacao)
      const [f, a] = await Promise.all([getFotos(reg.id), getAudios(reg.id)])
      setFotos(f)
      setAudios(a)
    }
    carregar()
  }, [id])

  const salvarCampos = useCallback(
    (campos: Partial<Pick<Registro, 'textoAnotacao'>>) => {
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

  if (!pavimento || !registro) return null

  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <TopBar title={pavimento.nome} subtitle="Anotações gerais" onBack />

      <main className="flex-1 space-y-4 p-4 pb-10">
        <div className="flex justify-end">
          <span className="text-xs text-gray-400">{salvo ? 'Salvo' : 'Salvando…'}</span>
        </div>

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
          <AnotacaoTexto
            valor={texto}
            onChange={handleTextoChange}
            placeholder="Digite suas observações gerais sobre este pavimento…"
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold text-brand-dark">Anotação por voz</h2>
          <AnotacaoVoz audios={audios} onGravado={handleGravado} onRemover={handleRemoverAudio} />
        </Card>
      </main>
    </div>
  )
}
