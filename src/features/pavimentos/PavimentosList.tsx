import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../../components/TopBar'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { Button } from '../../components/Button'
import { getVisitaAtiva, getPavimentos, contarRegistrosDoPavimento } from '../../db/repository'
import type { Visita, Pavimento } from '../../types'

interface LinhaPavimento extends Pavimento {
  total: number
  comRegistro: number
}

export function PavimentosList() {
  const navigate = useNavigate()
  const [visita, setVisita] = useState<Visita | null | 'carregando'>('carregando')
  const [linhas, setLinhas] = useState<LinhaPavimento[] | null>(null)

  useEffect(() => {
    async function carregar() {
      const v = await getVisitaAtiva()
      if (!v || v.id == null) {
        setVisita(null)
        return
      }
      setVisita(v)
      const pavs = await getPavimentos(v.id)
      const comContagem = await Promise.all(
        pavs.map(async (p) => {
          const { total, comRegistro } = await contarRegistrosDoPavimento(p.id)
          return { ...p, total, comRegistro }
        })
      )
      setLinhas(comContagem)
    }
    carregar()
  }, [])

  useEffect(() => {
    if (visita === null) navigate('/', { replace: true })
  }, [visita, navigate])

  if (visita === 'carregando' || visita === null || linhas === null) return null

  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <TopBar
        title={visita.obraNome}
        subtitle={`${linhas.length} pavimento(s)`}
        right={
          <button
            onClick={() => navigate('/resumo')}
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
                <p className="text-base text-gray-500">
                  {p.comRegistro} de {p.total} serviço(s) registrados
                </p>
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

        <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
          Importar outra planilha
        </Button>
      </main>
    </div>
  )
}
