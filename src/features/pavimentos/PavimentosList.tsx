import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar } from '../../components/TopBar'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { Button } from '../../components/Button'
import {
  getVisita,
  getPavimentos,
  contarRegistrosDoPavimento,
  getServicosEmExecucao,
  finalizarVisita,
} from '../../db/repository'
import type { Visita, Pavimento } from '../../types'
import { sincronizarVisita } from '../sync/driveSync'

interface LinhaPavimento extends Pavimento {
  total: number
  comRegistro: number
  emExecucao: string[]
}

export function PavimentosList() {
  const navigate = useNavigate()
  const { visitaId } = useParams<{ visitaId: string }>()
  const id = Number(visitaId)
  const [visita, setVisita] = useState<Visita | null | 'carregando'>('carregando')
  const [linhas, setLinhas] = useState<LinhaPavimento[] | null>(null)

  useEffect(() => {
    async function carregar() {
      const v = await getVisita(id)
      if (!v || v.id == null) {
        setVisita(null)
        return
      }
      setVisita(v)
      const pavs = await getPavimentos(v.id)
      const comContagem = await Promise.all(
        pavs.map(async (p) => {
          const [{ total, comRegistro }, emExecucao] = await Promise.all([
            contarRegistrosDoPavimento(p.id),
            getServicosEmExecucao(p.id),
          ])
          return { ...p, total, comRegistro, emExecucao }
        })
      )
      setLinhas(comContagem)
    }
    carregar()
  }, [id])

  useEffect(() => {
    if (visita === null) navigate('/', { replace: true })
  }, [visita, navigate])

  async function handleConcluirVisita() {
    if (visita === 'carregando' || visita === null) return
    if (visita.status !== 'finalizada') {
      await finalizarVisita(visita.id)
    }
    // Melhor esforço: tenta fazer o backup no Drive já ao concluir, mas sem
    // travar a navegação — se falhar (sem sinal, por exemplo), o botão de
    // sincronizar na tela de resumo permite tentar de novo depois.
    sincronizarVisita(visita.id).catch(() => {})
    navigate(`/visitas/${visita.id}/resumo`)
  }

  if (visita === 'carregando' || visita === null || linhas === null) return null

  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <TopBar
        title={visita.obraNome}
        subtitle={`${linhas.length} pavimento(s)`}
        onBack={() => navigate('/visitas')}
        right={
          <button
            onClick={() => navigate(`/visitas/${visita.id}/resumo`)}
            className="rounded-full px-3 py-2 text-sm font-semibold active:bg-white/15"
          >
            Resumo
          </button>
        }
      />
      <main className="flex-1 space-y-3 p-4 pb-10">
        {linhas.length === 0 && (
          <EmptyState
            title="Nenhum pavimento encontrado"
            description="Volte e importe a planilha novamente."
          />
        )}

        {linhas.map((p) => (
          <Card
            key={p.id}
            className="cursor-pointer active:bg-gray-50"
            onClick={() => navigate(`/pavimentos/${p.id}`)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-brand-dark">{p.nome}</p>
                {p.emExecucao.length > 0 ? (
                  <p className="truncate text-base text-status-em-execucao">
                    Em execução: {p.emExecucao.join(', ')}
                  </p>
                ) : (
                  <p className="text-base text-gray-400">Nenhum serviço em execução</p>
                )}
              </div>
              <span className="text-2xl text-gray-300">›</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: p.total ? `${(p.comRegistro / p.total) * 100}%` : '0%' }}
              />
            </div>
          </Card>
        ))}

        <Button variant="accent" fullWidth onClick={handleConcluirVisita}>
          {visita.status === 'finalizada' ? '✅ Visita concluída — ver relatório' : '✅ Visita concluída'}
        </Button>

        <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
          Importar outra planilha
        </Button>
      </main>
    </div>
  )
}
