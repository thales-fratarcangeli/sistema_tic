import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import type { OpComContexto } from '../../../shared/types'

export default function ProducaoApp() {
  const { user } = useAuth()
  const [ops, setOps] = useState<OpComContexto[]>([])
  const [quantidades, setQuantidades] = useState<Record<number, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [busyOpId, setBusyOpId] = useState<number | null>(null)

  async function reload() {
    setOps(await window.api.listOpsAbertas())
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleApontar(op: OpComContexto) {
    if (!user) return
    const raw = quantidades[op.id] ?? ''
    const quantidade = Number(raw.replace(',', '.'))
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      setErro('Informe uma quantidade válida para apontar')
      return
    }
    setErro(null)
    setBusyOpId(op.id)
    try {
      await window.api.createApontamento({ opId: op.id, usuarioId: user.id, quantidade })
      setQuantidades((prev) => ({ ...prev, [op.id]: '' }))
      await reload()
    } catch (err) {
      setErro('Não foi possível registrar o apontamento')
    } finally {
      setBusyOpId(null)
    }
  }

  async function handleEncerrar(op: OpComContexto) {
    const faltante = op.quantidadeSolicitada - op.quantidadeProduzida
    if (faltante > 0) {
      const confirmar = window.confirm(
        `Essa OP ainda tem ${faltante} unidade(s) não produzida(s). Encerrar mesmo assim?`
      )
      if (!confirmar) return
    }
    setErro(null)
    setBusyOpId(op.id)
    try {
      await window.api.encerrarOp(op.id)
      await reload()
    } catch (err) {
      setErro('Não foi possível encerrar a OP')
    } finally {
      setBusyOpId(null)
    }
  }

  return (
    <div>
      <h2>Ordens de produção</h2>
      {erro && <p className="error">{erro}</p>}

      <table>
        <thead>
          <tr>
            <th>OP</th>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Produto</th>
            <th>Solicitado</th>
            <th>Produzido</th>
            <th>Apontar quantidade</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ops.map((op) => (
            <tr key={op.id}>
              <td>{op.numero}</td>
              <td>{op.pedidoNumero}</td>
              <td>{op.clienteNome}</td>
              <td>{op.produtoDescricao}</td>
              <td>{op.quantidadeSolicitada}</td>
              <td>{op.quantidadeProduzida}</td>
              <td>
                <input
                  value={quantidades[op.id] ?? ''}
                  onChange={(e) =>
                    setQuantidades((prev) => ({ ...prev, [op.id]: e.target.value }))
                  }
                  disabled={busyOpId === op.id}
                />
                <button onClick={() => handleApontar(op)} disabled={busyOpId === op.id}>
                  Apontar
                </button>
              </td>
              <td>
                <button onClick={() => handleEncerrar(op)} disabled={busyOpId === op.id}>
                  Encerrar OP
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {ops.length === 0 && <p>Nenhuma OP em aberto.</p>}
    </div>
  )
}
