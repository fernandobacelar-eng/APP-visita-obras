import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../../components/TopBar'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { listarVisitas } from '../../db/repository'
import type { Visita } from '../../types'

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function VisitasAnteriores() {
  const navigate = useNavigate()
  const [visitas, setVisitas] = useState<Visita[] | null>(null)

  useEffect(() => {
    listarVisitas().then(setVisitas)
  }, [])

  if (visitas === null) return null

  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <TopBar title="Visitas anteriores" onBack={() => navigate('/')} />
      <main className="flex-1 space-y-3 p-4 pb-10">
        {visitas.length === 0 && (
          <EmptyState title="Nenhuma visita ainda" description="As visitas que você fizer vão aparecer aqui." />
        )}

        {visitas.map((v) => (
          <Card
            key={v.id}
            className="cursor-pointer active:bg-gray-50"
            onClick={() => navigate(`/visitas/${v.id}/pavimentos`)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-brand-dark">{v.obraNome}</p>
                <p className="truncate text-base text-gray-600">{formatarDataHora(v.dataVisita)}</p>
              </div>
              <span
                className={
                  'shrink-0 rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap ' +
                  (v.status === 'finalizada'
                    ? 'border-status-concluido bg-status-concluido/15 text-status-concluido'
                    : 'border-status-em-execucao bg-status-em-execucao/15 text-status-em-execucao')
                }
              >
                {v.status === 'finalizada' ? 'Concluída' : 'Em andamento'}
              </span>
            </div>
          </Card>
        ))}
      </main>
    </div>
  )
}
