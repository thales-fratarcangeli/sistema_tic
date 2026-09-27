/**
 * Erro de regra de negócio com o status HTTP que ele deve gerar. Lançado
 * pelos services e traduzido em resposta JSON pelo errorHandler.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message)
    this.name = 'AppError'
  }
}
