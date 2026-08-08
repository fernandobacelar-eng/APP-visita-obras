import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar } from '../../components/TopBar'
import { Card } from '../../components/Card'
import { StatusBadge } from '../../components/StatusBadge'
import { EmptyState } from '../../components/EmptyState'
import {
  getPavimento,
  getServicosDoPavimento,
  servicoTemRegistroPreenchido,
  atualizarAnotacaoGeral,
} from '../../db/repository'
import type { Pavimento, Servico, StatusServico } from '../../types'
import { STATUS_LABEL } from '../../lib/status'

interface LinhaServico extends Servico {
  registrado: boolean
}

const FILTROS: { chave: 'todos' | StatusServico; label: string }[] = [
  { chave: 'todos', label: 'Todos' },
  { chave: 'em_execucao', label: STATUS_LABEL.em_execucao },
  { chave: 'pendencia', label: STATUS_LABEL.pendencia },
  { chave: 'nao_iniciado', label: STATUS_LABEL.nao_iniciado },
  { chave: 'concluido', label: STATUS_LABEL.concluido },
]

export function ServicosList() {
  const { pavimentoId } = useParams<{ pavimentoId: string }>()
  const navigate = useNavigate()
  const [pavimento, setPavimento] = useState<Pavimento | null>(null)
  const [servicos, setServicos] = useState<LinhaServico[]>([])
  const [filtro, setFiltro] = useState<'todos' | StatusServico>('todos')
  const [anotacaoGeral, setAnotacaoGeral] = useState('')
  const [salvo, setSalvo] = useState(true)
  const anotacaoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function carregar() {
      const id = Number(pavimentoId)
      if (!id) return
      const [pav, servs] = await Promise.all([getPavimento(id), getServicosDoPavimento(id)])
      setPavimento(pav ?? null)
      setAnotacaoGeral(pav?.anotacaoGeral ?? '')
      const comRegistro = await Promise.all(
        servs.map(async (s) => ({ ...s, registrado: s.id != null && (await servicoTemRegistroPreenchido(s.id)) }))
      )
      setServicos(comRegistro)
    }
    carregar()
  }, [pavimentoId])

  function handleAnotacaoGeralChange(texto: string) {
    setAnotacaoGeral(texto)
    if (!pavimento) return
    setSalvo(false)
    if (anotacaoTimer.current) clearTimeout(anotacaoTimer.current)
    anotacaoTimer.current = setTimeout(() => {
      atualizarAnotacaoGeral(pavimento.id, texto).then(() => setSalvo(true))
    }, 500)
  }

  const filtrados = filtro === 'todos' ? servicos : servicos.filter((s) => s.statusNormalizado === filtro)

  const filtrosDisponiveis = FILTROS.filter(
    (f) => f.chave === 'todos' || servicos.some((s) => s.statusNormalizado === f.chave)
  )

  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <TopBar title={pavimento?.nome ?? 'Pavimento'} subtitle="Serviços" onBack />

      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 bg-white p-3">
        {filtrosDisponiveis.map((f) => (
          <button
            key={f.chave}
            onClick={() => setFiltro(f.chave)}
            className={`shrink-0 rounded-full border-2 px-4 py-2 text-sm font-semibold ${
              filtro === f.chave
                ? 'border-brand bg-brand text-white'
                : 'border-gray-300 bg-white text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <main className="flex-1 space-y-3 p-4 pb-10">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-dark">Anotações gerais do pavimento</h2>
            <span className="text-xs text-gray-400">{salvo ? 'Salvo' : 'Salvando…'}</span>
          </div>
          <textarea
            value={anotacaoGeral}
            onChange={(e) => handleAnotacaoGeralChange(e.target.value)}
            placeholder="Observações sobre o pavimento como um todo, não ligadas a um serviço específico…"
            rows={3}
            className="mt-2 w-full rounded-xl border-2 border-gray-300 p-3 text-base leading-relaxed"
          />
        </Card>

        {filtrados.length === 0 && (
          <EmptyState title="Nenhum serviço nesse filtro" />
        )}

        {filtrados.map((s) => (
          <Card
            key={s.id}
            className="cursor-pointer active:bg-gray-50"
            onClick={() => navigate(`/servicos/${s.id}`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-brand-dark">{s.nome}</p>
                {s.observacaoImportada && (
                  <p className="mt-0.5 truncate text-sm text-gray-500">{s.observacaoImportada}</p>
                )}
                <div className="mt-2">
                  <StatusBadge status={s.statusNormalizado} />
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                {s.registrado && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-status-concluido text-white">
                    ✓
                  </span>
                )}
                <span className="text-2xl text-gray-300">›</span>
              </div>
            </div>
          </Card>
        ))}
      </main>
    </div>
  )
}
