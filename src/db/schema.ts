import Dexie, { type EntityTable } from 'dexie'
import type { Visita, Pavimento, Servico, Registro, Foto, Audio } from '../types'

class VisitaObraDB extends Dexie {
  visitas!: EntityTable<Visita, 'id'>
  pavimentos!: EntityTable<Pavimento, 'id'>
  servicos!: EntityTable<Servico, 'id'>
  registros!: EntityTable<Registro, 'id'>
  fotos!: EntityTable<Foto, 'id'>
  audios!: EntityTable<Audio, 'id'>

  constructor() {
    super('visita-obra-db')
    this.version(1).stores({
      visitas: '++id, status',
      pavimentos: '++id, visitaId, ordem',
      servicos: '++id, pavimentoId, statusNormalizado, ordem',
      registros: '++id, &servicoId',
      fotos: '++id, registroId',
      audios: '++id, registroId',
    })
    // v2: registros passam a poder pertencer a um pavimento inteiro (anotações
    // gerais), além de a um serviço específico.
    this.version(2).stores({
      registros: '++id, &servicoId, &pavimentoId',
    })
  }
}

export const db = new VisitaObraDB()
