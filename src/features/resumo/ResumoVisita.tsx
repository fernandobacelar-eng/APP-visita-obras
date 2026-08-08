import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../../components/TopBar'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { StatusBadge } from '../../components/StatusBadge'
import { EmptyState } from '../../components/EmptyState'
import { getVisitaAtiva, getResumoVisita, type ResumoPavimento, type ResumoServico } from '../../db/repository'
import type { Visita } from '../../types'
import { useObjectUrl } from '../../hooks/useObjectUrl'

function FotoMini({ blob }: { blob: Blob }) {
  const url = useObjectUrl(blob)
  if (!url) return null
  return <img src={url} alt="Foto" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
}

function AnotacaoGeralResumo({ pavimento }: { pavimento: ResumoPavimento }) {
  const { registroGeral, fotosGerais, audiosGerais } = pavimento
  const temConteudo = !!registroGeral?.textoAnotacao.trim() || fotosGerais.length > 0 || audiosGerais.length > 0
  if (!temConteudo) return null

  return (
    <Card className="mb-3 bg-brand/5">
      <p className="text-sm font-semibold text-gray-500">Anotações gerais do pavimento</p>

      {registroGeral?.textoAnotacao.trim() && (
        <p className="mt-2 text-base text-gray-700">{registroGeral.textoAnotacao}</p>
      )}

      {audiosGerais.map((a) => (
        <p key={a.id} className="mt-1 text-sm text-gray-600">
          🎙️{' '}
          {a.statusTranscricao === 'transcrito' && a.transcricao
            ? `"${a.transcricao}"`
            : 'Áudio salvo — aguardando transcrição'}
        </p>
      ))}

      {fotosGerais.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {fotosGerais.map((f) => (
            <FotoMini key={f.id} blob={f.blob} />
          ))}
        </div>
      )}
    </Card>
  )
}

function ServicoResumo({ servico }: { servico: ResumoServico }) {
  const temConteudo =
    !!servico.registro?.textoAnotacao.trim() || servico.fotos.length > 0 || servico.audios.length > 0

  return (
    <Card className={temConteudo ? '' : 'opacity-60'}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-bold text-brand-dark">{servico.nome}</p>
        <StatusBadge status={servico.statusNormalizado} />
      </div>

      {!temConteudo && <p className="mt-1 text-sm text-gray-400">Sem registro nesta visita.</p>}

      {servico.registro?.textoAnotacao.trim() && (
        <p className="mt-2 text-base text-gray-700">{servico.registro.textoAnotacao}</p>
      )}

      {servico.audios.map((a) => (
        <p key={a.id} className="mt-1 text-sm text-gray-600">
          🎙️{' '}
          {a.statusTranscricao === 'transcrito' && a.transcricao
            ? `"${a.transcricao}"`
            : 'Áudio salvo — aguardando transcrição'}
        </p>
      ))}

      {servico.fotos.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {servico.fotos.map((f) => (
            <FotoMini key={f.id} blob={f.blob} />
          ))}
        </div>
      )}
    </Card>
  )
}

export function ResumoVisita() {
  const navigate = useNavigate()
  const [visita, setVisita] = useState<Visita | null>(null)
  const [pavimentos, setPavimentos] = useState<ResumoPavimento[]>([])
  const [apenasComRegistro, setApenasComRegistro] = useState(true)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const v = await getVisitaAtiva()
      if (!v || v.id == null) {
        setCarregando(false)
        return
      }
      setVisita(v)
      setPavimentos(await getResumoVisita(v.id))
      setCarregando(false)
    }
    carregar()
  }, [])

  if (carregando) return null

  if (!visita) {
    return (
      <div className="flex min-h-svh flex-col bg-gray-50">
        <TopBar title="Resumo" onBack />
        <main className="flex-1 p-4">
          <EmptyState title="Nenhuma visita ativa" description="Importe uma planilha para começar." />
        </main>
      </div>
    )
  }

  const pavimentosFiltrados = pavimentos
    .map((p) => ({
      ...p,
      servicos: apenasComRegistro
        ? p.servicos.filter(
            (s) => s.registro?.textoAnotacao.trim() || s.fotos.length > 0 || s.audios.length > 0
          )
        : p.servicos,
    }))
    .filter(
      (p) =>
        p.servicos.length > 0 ||
        p.registroGeral?.textoAnotacao.trim() ||
        p.fotosGerais.length > 0 ||
        p.audiosGerais.length > 0
    )

  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <TopBar title="Resumo da visita" subtitle={visita.obraNome} onBack={() => navigate('/pavimentos')} />

      <main className="flex-1 space-y-4 p-4 pb-10">
        {visita.status === 'finalizada' && (
          <p className="rounded-lg bg-status-concluido/10 p-3 text-base font-semibold text-status-concluido">
            ✅ Visita concluída em {new Date(visita.dataVisita).toLocaleDateString('pt-BR')}
          </p>
        )}

        <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-base text-gray-600">
            <input
              type="checkbox"
              checked={apenasComRegistro}
              onChange={(e) => setApenasComRegistro(e.target.checked)}
              className="h-5 w-5"
            />
            Mostrar apenas serviços com registro
          </label>
          <Button variant="secondary" onClick={() => window.print()}>
            🖨 Gerar relatório
          </Button>
        </div>

        {pavimentosFiltrados.length === 0 && (
          <EmptyState
            title="Nada registrado ainda"
            description="Volte para os pavimentos e registre fotos, textos ou áudios."
          />
        )}

        {pavimentosFiltrados.map((p) => (
          <div key={p.id}>
            <h2 className="mb-2 text-xl font-bold text-brand-dark">{p.nome}</h2>
            <AnotacaoGeralResumo pavimento={p} />
            <div className="space-y-3">
              {p.servicos.map((s) => (
                <ServicoResumo key={s.id} servico={s} />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
