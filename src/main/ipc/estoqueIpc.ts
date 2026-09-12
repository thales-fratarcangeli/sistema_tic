import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { IpcChannels } from '../../shared/ipc-channels'
import type { CreateMovimentoEstoqueInput } from '../../shared/types'
import {
  listAguardandoEntrada,
  listEmEstoque,
  registrarEntrada,
  registrarSaida,
} from '../db/repositories/estoque.repo'

export function registerEstoqueIpc(db: Database.Database, dbFilePath: string) {
  ipcMain.handle(IpcChannels.ESTOQUE_LIST_AGUARDANDO_ENTRADA, () => listAguardandoEntrada(db))
  ipcMain.handle(IpcChannels.ESTOQUE_LIST_EM_ESTOQUE, () => listEmEstoque(db))

  ipcMain.handle(
    IpcChannels.ESTOQUE_REGISTRAR_ENTRADA,
    (_event, input: CreateMovimentoEstoqueInput) => registrarEntrada(db, dbFilePath, input)
  )
  ipcMain.handle(
    IpcChannels.ESTOQUE_REGISTRAR_SAIDA,
    (_event, input: CreateMovimentoEstoqueInput) => registrarSaida(db, dbFilePath, input)
  )
}
