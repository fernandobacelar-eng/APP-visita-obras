import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../../components/TopBar'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { getVisitaAtiva, criarVisitaComPavimentos } from '../../db/repository'
import type { Visita } from '../../types'
import { parseExcelFile, ExcelParseError, type ParseResult } from './excelParser'
import {
  buscarArquivoDrive,
  DriveApiError,
  getDriveApiKeySalva,
  salvarDriveApiKey,
  getDriveLinkSalvo,
  salvarDriveLink,
} from './driveApi'

export function ImportScreen() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [visitaAtiva, setVisitaAtiva] = useState<Visita | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [obraNome, setObraNome] = useState('')
  const [iniciando, setIniciando] = useState(false)

  const [driveApiKey, setDriveApiKey] = useState('')
  const [driveLink, setDriveLink] = useState('')
  const [driveCarregando, setDriveCarregando] = useState(false)
  const [driveErro, setDriveErro] = useState<string | null>(null)

  useEffect(() => {
    getVisitaAtiva().then((v) => setVisitaAtiva(v ?? null))
    const chaveSalva = getDriveApiKeySalva()
    const linkSalvo = getDriveLinkSalvo()
    setDriveApiKey(chaveSalva)
    setDriveLink(linkSalvo)
    // Já tem chave e link salvos de uma vez anterior: busca sozinho, sem
    // precisar preencher nem clicar em nada — só se estiver online, pra não
    // atrasar/travar a abertura do app sem sinal.
    if (chaveSalva.trim() && linkSalvo.trim() && navigator.onLine) {
      buscarEProcessar(chaveSalva, linkSalvo)
    }
  }, [])

  async function processarArquivo(file: File) {
    setErro(null)
    setParseResult(null)
    try {
      const result = await parseExcelFile(file)
      setParseResult(result)
      setObraNome(file.name.replace(/\.xlsx$/i, ''))
    } catch (err) {
      setErro(err instanceof ExcelParseError ? err.message : 'Não foi possível ler esse arquivo. Confira se é um .xlsx válido.')
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCarregando(true)
    try {
      await processarArquivo(file)
    } finally {
      setCarregando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function buscarEProcessar(apiKey: string, link: string) {
    setDriveErro(null)
    setDriveCarregando(true)
    try {
      const file = await buscarArquivoDrive(apiKey, link)
      await processarArquivo(file)
    } catch (err) {
      setDriveErro(err instanceof DriveApiError ? err.message : 'Não foi possível buscar o arquivo no Drive.')
    } finally {
      setDriveCarregando(false)
    }
  }

  function handleBuscarDrive() {
    salvarDriveApiKey(driveApiKey)
    salvarDriveLink(driveLink)
    buscarEProcessar(driveApiKey, driveLink)
  }

  async function handleIniciarVisita() {
    if (!parseResult) return
    setIniciando(true)
    try {
      await criarVisitaComPavimentos(obraNome.trim() || 'Obra', parseResult.pavimentos)
      navigate('/pavimentos')
    } finally {
      setIniciando(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <TopBar title="Visita à Obra" subtitle="Importar planilha" />
      <main className="flex-1 space-y-4 p-4 pb-10">
        <p className="text-center text-2xl font-extrabold tracking-tight text-brand-dark">BTB</p>
        {visitaAtiva && !parseResult && (
          <Card className="border-accent bg-accent/10">
            <p className="font-semibold text-brand-dark">
              {visitaAtiva.status === 'finalizada' ? 'Última visita concluída' : 'Visita em andamento'}
            </p>
            <p className="mt-1 text-base text-gray-700">
              {visitaAtiva.obraNome} — importada em{' '}
              {new Date(visitaAtiva.dataImportacao).toLocaleDateString('pt-BR')}
            </p>
            <Button className="mt-3" fullWidth onClick={() => navigate('/pavimentos')}>
              {visitaAtiva.status === 'finalizada' ? 'Ver visita' : 'Continuar visita'}
            </Button>
          </Card>
        )}

        <Card>
          <h2 className="text-lg font-bold text-brand-dark">Importar automaticamente do Drive</h2>
          <p className="mt-1 text-base text-gray-600">
            Preencha uma vez — fica salvo neste aparelho. Nas próximas vezes, com internet, o
            app já busca sozinho assim que você abrir esta tela (arquivo precisa continuar
            compartilhado como "Qualquer pessoa com o link").
          </p>

          <label className="mt-3 block text-sm font-semibold text-gray-600">Chave de API do Google</label>
          <input
            value={driveApiKey}
            onChange={(e) => setDriveApiKey(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-gray-300 p-3 text-base"
            placeholder="Cole aqui a chave de API"
            type="password"
          />

          <label className="mt-3 block text-sm font-semibold text-gray-600">Link ou ID da planilha no Drive</label>
          <input
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-gray-300 p-3 text-base"
            placeholder="Cole aqui o link do Drive"
            inputMode="url"
          />

          <Button
            variant="primary"
            fullWidth
            className="mt-4"
            disabled={driveCarregando || !driveApiKey.trim() || !driveLink.trim()}
            onClick={handleBuscarDrive}
          >
            {driveCarregando ? 'Buscando…' : '☁️ Buscar do Drive'}
          </Button>

          {driveErro && (
            <p className="mt-4 rounded-lg bg-status-pendencia/10 p-3 text-base text-status-pendencia">
              {driveErro}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-brand-dark">
            {visitaAtiva ? 'Importar nova planilha' : 'Comece importando a planilha da obra'}
          </h2>
          <p className="mt-1 text-base text-gray-600">
            Selecione o painel de curva física da obra (.xlsx): pavimentos na coluna B,
            serviços na linha 3, com "EXECUÇÃO"/"RABO" marcando a frente de cada serviço.
          </p>

          {visitaAtiva && !parseResult && (
            <p className="mt-2 rounded-lg bg-status-pendencia/10 p-2 text-sm text-status-pendencia">
              Atenção: importar uma nova planilha substitui a visita em andamento e os registros
              feitos nela.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              id="excel-input"
              onChange={handleFileChange}
            />
            <Button
              variant="secondary"
              fullWidth
              disabled={carregando}
              onClick={() => fileInputRef.current?.click()}
            >
              {carregando ? 'Lendo planilha…' : '📄 Selecionar planilha (.xlsx)'}
            </Button>
          </div>

          {erro && (
            <p className="mt-4 rounded-lg bg-status-pendencia/10 p-3 text-base text-status-pendencia">
              {erro}
            </p>
          )}
        </Card>

        {parseResult && (
          <Card className="border-status-concluido">
            <h2 className="text-lg font-bold text-brand-dark">Planilha lida com sucesso</h2>
            <p className="mt-1 text-base text-gray-700">
              {parseResult.preview.pavimentos.length} pavimento(s), {parseResult.preview.totalServicos} serviço(s).
            </p>

            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm text-gray-600">
              {parseResult.preview.pavimentos.map((p) => (
                <li key={p.nome} className="flex justify-between border-b border-gray-100 py-1">
                  <span>{p.nome}</span>
                  <span className="text-gray-400">{p.servicos} serviço(s)</span>
                </li>
              ))}
            </ul>

            {parseResult.preview.avisos.length > 0 && (
              <div className="mt-3 rounded-lg bg-status-em-execucao/10 p-2 text-sm text-status-em-execucao">
                {parseResult.preview.avisos.slice(0, 5).map((a, i) => (
                  <p key={i}>{a}</p>
                ))}
              </div>
            )}

            <label className="mt-4 block text-sm font-semibold text-gray-600">Nome da obra</label>
            <input
              value={obraNome}
              onChange={(e) => setObraNome(e.target.value)}
              className="mt-1 w-full rounded-xl border-2 border-gray-300 p-3 text-lg"
              placeholder="Ex: Villa Lobos"
            />

            <Button
              variant="accent"
              fullWidth
              className="mt-4"
              disabled={iniciando}
              onClick={handleIniciarVisita}
            >
              {iniciando ? 'Iniciando…' : '▶ Iniciar visita'}
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}
