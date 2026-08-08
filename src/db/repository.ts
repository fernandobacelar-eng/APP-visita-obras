import Dexie from 'dexie'
import { db } from './schema'
import type {
  Visita,
  Pavimento,
  Servico,
  Registro,
  StatusTranscricao,
} from '../types'

/**
 * Retorna a visita atual (a única que existe por vez — importar uma nova
 * planilha substitui a anterior), esteja ela em andamento ou já finalizada.
 * Não filtra por status: uma visita concluída continua sendo "a visita
 * atual" até que uma nova planilha seja importada.
 */
export async function getVisitaAtiva(): Promise<Visita | undefined> {
  return db.visitas.orderBy('id').last()
}

export async function criarVisitaComPavimentos(
  obraNome: string,
  pavimentosImportados: {
    nome: string
    servicos: { nome: string; status: string; statusNormalizado: Servico['statusNormalizado']; observacao?: string }[]
  }[]
): Promise<number> {
  const anteriores = await db.visitas.where('status').equals('em_andamento').toArray()
  await db.transaction(
    'rw',
    [db.visitas, db.pavimentos, db.servicos, db.registros, db.fotos, db.audios],
    async () => {
    for (const antiga of anteriores) {
      if (antiga.id == null) continue
      const pavs = await db.pavimentos.where('visitaId').equals(antiga.id).toArray()
      for (const p of pavs) {
        if (p.id == null) continue
        const servs = await db.servicos.where('pavimentoId').equals(p.id).toArray()
        for (const s of servs) {
          if (s.id == null) continue
          const regs = await db.registros.where('servicoId').equals(s.id).toArray()
          for (const r of regs) {
            if (r.id == null) continue
            await db.fotos.where('registroId').equals(r.id).delete()
            await db.audios.where('registroId').equals(r.id).delete()
          }
          await db.registros.where('servicoId').equals(s.id).delete()
        }
        await db.servicos.where('pavimentoId').equals(p.id).delete()

        const regsGerais = await db.registros.where('pavimentoId').equals(p.id).toArray()
        for (const r of regsGerais) {
          if (r.id == null) continue
          await db.fotos.where('registroId').equals(r.id).delete()
          await db.audios.where('registroId').equals(r.id).delete()
        }
        await db.registros.where('pavimentoId').equals(p.id).delete()
      }
      await db.pavimentos.where('visitaId').equals(antiga.id).delete()
      await db.visitas.delete(antiga.id)
    }
  })

  const agora = new Date().toISOString()
  const visitaId = await db.visitas.add({
    obraNome,
    dataImportacao: agora,
    dataVisita: agora,
    status: 'em_andamento',
  })

  let ordemPavimento = 0
  for (const pav of pavimentosImportados) {
    const pavimentoId = await db.pavimentos.add({
      visitaId,
      nome: pav.nome,
      ordem: ordemPavimento++,
    })
    let ordemServico = 0
    for (const s of pav.servicos) {
      await db.servicos.add({
        pavimentoId,
        nome: s.nome,
        statusImportado: s.status,
        statusNormalizado: s.statusNormalizado,
        observacaoImportada: s.observacao,
        ordem: ordemServico++,
      })
    }
  }

  return visitaId
}

export async function getPavimentos(visitaId: number): Promise<Pavimento[]> {
  return db.pavimentos.where('visitaId').equals(visitaId).sortBy('ordem')
}

export async function getServicosDoPavimento(pavimentoId: number): Promise<Servico[]> {
  return db.servicos.where('pavimentoId').equals(pavimentoId).sortBy('ordem')
}

export async function getServicosEmExecucao(pavimentoId: number): Promise<string[]> {
  const servicos = await db.servicos
    .where('pavimentoId')
    .equals(pavimentoId)
    .and((s) => s.statusNormalizado === 'em_execucao')
    .sortBy('ordem')
  return servicos.map((s) => s.nome)
}

export async function getServico(servicoId: number): Promise<Servico | undefined> {
  return db.servicos.get(servicoId)
}

export async function getPavimento(pavimentoId: number): Promise<Pavimento | undefined> {
  return db.pavimentos.get(pavimentoId)
}

export async function getOuCriarRegistro(servicoId: number): Promise<Registro> {
  const existente = await db.registros.where('servicoId').equals(servicoId).first()
  if (existente) return existente
  const agora = new Date().toISOString()
  try {
    const id = await db.registros.add({
      servicoId,
      criadoEm: agora,
      atualizadoEm: agora,
      textoAnotacao: '',
      qdpPlaceholder: '',
    })
    return (await db.registros.get(id))!
  } catch (err) {
    // Duas chamadas concorrentes (ex: efeitos duplicados do React em dev)
    // podem tentar criar o mesmo registro ao mesmo tempo; a segunda perde
    // por causa do índice único em servicoId — nesse caso só reaproveitamos
    // o registro que a primeira já criou.
    if (err instanceof Dexie.ConstraintError) {
      const criadoPeloConcorrente = await db.registros.where('servicoId').equals(servicoId).first()
      if (criadoPeloConcorrente) return criadoPeloConcorrente
    }
    throw err
  }
}

export async function getOuCriarRegistroPavimento(pavimentoId: number): Promise<Registro> {
  const existente = await db.registros.where('pavimentoId').equals(pavimentoId).first()
  if (existente) return existente
  const agora = new Date().toISOString()
  try {
    const id = await db.registros.add({
      pavimentoId,
      criadoEm: agora,
      atualizadoEm: agora,
      textoAnotacao: '',
      qdpPlaceholder: '',
    })
    return (await db.registros.get(id))!
  } catch (err) {
    if (err instanceof Dexie.ConstraintError) {
      const criadoPeloConcorrente = await db.registros.where('pavimentoId').equals(pavimentoId).first()
      if (criadoPeloConcorrente) return criadoPeloConcorrente
    }
    throw err
  }
}

export async function atualizarRegistro(
  registroId: number,
  campos: Partial<Pick<Registro, 'textoAnotacao' | 'qdpPlaceholder'>>
): Promise<void> {
  await db.registros.update(registroId, {
    ...campos,
    atualizadoEm: new Date().toISOString(),
  })
}

export async function adicionarFoto(registroId: number, blob: Blob): Promise<number> {
  return db.fotos.add({ registroId, blob, criadoEm: new Date().toISOString() })
}

export async function removerFoto(fotoId: number): Promise<void> {
  await db.fotos.delete(fotoId)
}

export async function getFotos(registroId: number) {
  return db.fotos.where('registroId').equals(registroId).sortBy('criadoEm')
}

export async function adicionarAudio(
  registroId: number,
  blob: Blob,
  transcricao: string | null,
  statusTranscricao: StatusTranscricao
): Promise<number> {
  return db.audios.add({
    registroId,
    blob,
    transcricao,
    statusTranscricao,
    criadoEm: new Date().toISOString(),
  })
}

export async function removerAudio(audioId: number): Promise<void> {
  await db.audios.delete(audioId)
}

export async function getAudios(registroId: number) {
  return db.audios.where('registroId').equals(registroId).sortBy('criadoEm')
}

export async function servicoTemRegistroPreenchido(servicoId: number): Promise<boolean> {
  const reg = await db.registros.where('servicoId').equals(servicoId).first()
  if (!reg || reg.id == null) return false
  if (reg.textoAnotacao.trim()) return true
  if ((await db.fotos.where('registroId').equals(reg.id).count()) > 0) return true
  if ((await db.audios.where('registroId').equals(reg.id).count()) > 0) return true
  return false
}

export async function pavimentoTemAnotacaoGeral(pavimentoId: number): Promise<boolean> {
  const reg = await db.registros.where('pavimentoId').equals(pavimentoId).first()
  if (!reg || reg.id == null) return false
  if (reg.textoAnotacao.trim()) return true
  if ((await db.fotos.where('registroId').equals(reg.id).count()) > 0) return true
  if ((await db.audios.where('registroId').equals(reg.id).count()) > 0) return true
  return false
}

export async function contarRegistrosDoPavimento(pavimentoId: number): Promise<{ total: number; comRegistro: number }> {
  const servicos = await getServicosDoPavimento(pavimentoId)
  let comRegistro = 0
  for (const s of servicos) {
    if (s.id == null) continue
    if (await servicoTemRegistroPreenchido(s.id)) comRegistro++
  }
  return { total: servicos.length, comRegistro }
}

export async function finalizarVisita(visitaId: number): Promise<void> {
  await db.visitas.update(visitaId, { status: 'finalizada' })
}

export interface ResumoServico extends Servico {
  registro: Registro | null
  fotos: Awaited<ReturnType<typeof getFotos>>
  audios: Awaited<ReturnType<typeof getAudios>>
}

export interface ResumoPavimento extends Pavimento {
  servicos: ResumoServico[]
  registroGeral: Registro | null
  fotosGerais: Awaited<ReturnType<typeof getFotos>>
  audiosGerais: Awaited<ReturnType<typeof getAudios>>
}

export async function getResumoVisita(visitaId: number): Promise<ResumoPavimento[]> {
  const pavimentos = await getPavimentos(visitaId)
  const resultado: ResumoPavimento[] = []

  for (const pav of pavimentos) {
    if (pav.id == null) continue
    const servicos = await getServicosDoPavimento(pav.id)
    const servicosComRegistro: ResumoServico[] = []
    for (const s of servicos) {
      if (s.id == null) continue
      const registro = (await db.registros.where('servicoId').equals(s.id).first()) ?? null
      const fotos = registro?.id != null ? await getFotos(registro.id) : []
      const audios = registro?.id != null ? await getAudios(registro.id) : []
      servicosComRegistro.push({ ...s, registro, fotos, audios })
    }

    const registroGeral = (await db.registros.where('pavimentoId').equals(pav.id).first()) ?? null
    const fotosGerais = registroGeral?.id != null ? await getFotos(registroGeral.id) : []
    const audiosGerais = registroGeral?.id != null ? await getAudios(registroGeral.id) : []

    resultado.push({ ...pav, servicos: servicosComRegistro, registroGeral, fotosGerais, audiosGerais })
  }

  return resultado
}
