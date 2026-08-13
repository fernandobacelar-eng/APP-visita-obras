import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../../components/TopBar'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { getVisitaAtiva, criarVisitaComPavimentos } from '../../db/repository'
import type { Visita } from '../../types'
import bannerPredio from '../../assets/villa-lobos-banner.jpg'
import { parseExcelFile, ExcelParseError, type ParseResult } from './excelParser'
import {
  buscarArquivoDrive,
  DriveApiError,
  getUltimaAtualizacaoSalva,
  salvarUltimaAtualizacao,
} from './driveApi'

// Embutidos no build via .env.local (não versionado) — o app já sai pronto
// pra usar, sem nenhuma configuração por quem abrir o link.
const OBRA_NOME = import.meta.env.VITE_OBRA_NOME || 'Obra'
const DRIVE_API_KEY = import.meta.env.VITE_DRIVE_API_KEY ?? ''
const DRIVE_LINK = import.meta.env.VITE_DRIVE_LINK ?? ''

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function ImportScreen() {
  const navigate = useNavigate()

  const [visitaAtiva, setVisitaAtiva] = useState<Visita | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(false)

  useEffect(() => {
    getVisitaAtiva().then((v) => setVisitaAtiva(v ?? null))
    setUltimaAtualizacao(getUltimaAtualizacaoSalva())
    if (navigator.onLine) {
      buscarAtualizacao()
    }
  }, [])

  async function buscarAtualizacao() {
    setErro(null)
    setCarregando(true)
    try {
      const file = await buscarArquivoDrive(DRIVE_API_KEY, DRIVE_LINK)
      const result = await parseExcelFile(file)
      setParseResult(result)
      const agora = new Date().toISOString()
      salvarUltimaAtualizacao(agora)
      setUltimaAtualizacao(agora)
    } catch (err) {
      setErro(
        err instanceof DriveApiError || err instanceof ExcelParseError
          ? err.message
          : 'Não foi possível atualizar o arquivo agora.'
      )
    } finally {
      setCarregando(false)
    }
  }

  async function handleIniciarVisita() {
    if (!parseResult) return
    setIniciando(true)
    try {
      const visitaId = await criarVisitaComPavimentos(OBRA_NOME, parseResult.pavimentos)
      navigate(`/visitas/${visitaId}/pavimentos`)
    } finally {
      setIniciando(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <TopBar title="Visita à Obra" subtitle={OBRA_NOME} />
      <main className="flex-1 space-y-4 p-4 pb-10">
        <img src={bannerPredio} alt={OBRA_NOME} className="w-full rounded-2xl object-cover shadow-sm" />

        {visitaAtiva && (
          <Card className="border-accent bg-accent/10">
            <p className="font-semibold text-brand-dark">
              {visitaAtiva.status === 'finalizada' ? 'Última visita concluída' : 'Visita em andamento'}
            </p>
            <p className="mt-1 text-base text-gray-700">
              {visitaAtiva.obraNome} — importada em{' '}
              {new Date(visitaAtiva.dataImportacao).toLocaleDateString('pt-BR')}
            </p>
            <Button className="mt-3" fullWidth onClick={() => navigate(`/visitas/${visitaAtiva.id}/pavimentos`)}>
              {visitaAtiva.status === 'finalizada' ? 'Ver visita' : 'Continuar visita'}
            </Button>
          </Card>
        )}

        <Card>
          <h2 className="text-lg font-bold text-brand-dark">{OBRA_NOME}</h2>
          <p className="mt-1 text-base text-gray-600">
            {carregando
              ? 'Buscando dados mais recentes…'
              : ultimaAtualizacao
                ? `Última atualização: ${formatarDataHora(ultimaAtualizacao)}`
                : 'Ainda não foi possível buscar o arquivo.'}
          </p>

          <Button variant="secondary" className="mt-3" disabled={carregando} onClick={buscarAtualizacao}>
            {carregando ? 'Atualizando…' : '🔄 Atualizar arquivo'}
          </Button>

          {erro && (
            <p className="mt-3 rounded-lg bg-status-pendencia/10 p-3 text-base text-status-pendencia">
              {erro}
            </p>
          )}
        </Card>

        {parseResult && (
          <Button variant="accent" fullWidth disabled={iniciando} onClick={handleIniciarVisita}>
            {iniciando ? 'Iniciando…' : '▶ Começar visita'}
          </Button>
        )}

        <Button variant="secondary" fullWidth onClick={() => navigate('/visitas')}>
          📋 Visitas anteriores
        </Button>
      </main>
    </div>
  )
}
