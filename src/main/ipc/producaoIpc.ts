import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { IpcChannels } from '../../shared/ipc-channels'
import type { CreateApontamentoInput } from '../../shared/types'
import { listOpsAbertas, createApontamento, encerrarOp } from '../db/repositories/producao.repo'

export function registerProducaoIpc(db: Database.Database, dbFilePath: string) {
  ipcMain.handle(IpcChannels.PRODUCAO_LIST_OPS_ABERTAS, () => listOpsAbertas(db))

  ipcMain.handle(IpcChannels.PRODUCAO_CREATE_APONTAMENTO, (_event, input: CreateApontamentoInput) =>
    createApontamento(db, dbFilePath, input)
  )

  ipcMain.handle(IpcChannels.PRODUCAO_ENCERRAR_OP, (_event, opId: number) =>
    encerrarOp(db, dbFilePath, opId)
  )
}
