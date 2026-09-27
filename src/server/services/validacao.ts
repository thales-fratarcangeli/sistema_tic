import { AppError } from '../errors/AppError'

// Validações de entrada compartilhadas pelos services. O corpo das
// requisições chega como JSON sem tipo garantido, então nada aqui confia
// no tipo declarado no DTO.

export function textoObrigatorio(valor: unknown, mensagem: string): string {
  if (typeof valor !== 'string' || valor.trim() === '') throw new AppError(mensagem, 400)
  return valor.trim()
}

export function textoOpcional(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const texto = valor.trim()
  return texto === '' ? null : texto
}

export function numeroPositivo(valor: unknown, mensagem: string): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    throw new AppError(mensagem, 400)
  }
  return valor
}

export function idValido(valor: unknown, mensagem: string): number {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor <= 0) {
    throw new AppError(mensagem, 400)
  }
  return valor
}
