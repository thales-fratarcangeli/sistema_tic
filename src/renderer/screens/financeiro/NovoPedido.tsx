import { useEffect, useState } from 'react'
import type { Cliente, Produto } from '../../../shared/types'
import { useAuth } from '../../auth/AuthContext'

interface ItemForm {
  produtoId: string
  quantidade: string
  valorUnitario: string
}

function novoItem(): ItemForm {
  return { produtoId: '', quantidade: '', valorUnitario: '' }
}

export default function NovoPedido({ onCriado }: { onCriado: () => void }) {
  const { user } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clienteId, setClienteId] = useState('')
  const [condicaoPagamento, setCondicaoPagamento] = useState('')
  const [prazoEntrega, setPrazoEntrega] = useState('')
  const [itens, setItens] = useState<ItemForm[]>([novoItem()])
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    window.api.listClientes().then(setClientes)
    window.api.listProdutos().then(setProdutos)
  }, [])

  function updateItem(index: number, patch: Partial<ItemForm>) {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function handleProdutoChange(index: number, produtoId: string) {
    const produto = produtos.find((p) => String(p.id) === produtoId)
    updateItem(index, {
      produtoId,
      valorUnitario: produto ? String(produto.valorUnitarioPadrao) : '',
    })
  }

  function addItem() {
    setItens((prev) => [...prev, novoItem()])
  }

  function removeItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    if (!clienteId) {
      setErro('Selecione um cliente')
      return
    }

    const itensValidos = itens
      .map((item) => ({
        produtoId: Number(item.produtoId),
        quantidade: Number(item.quantidade.replace(',', '.')),
        valorUnitario: Number(item.valorUnitario.replace(',', '.')),
      }))
      .filter(
        (item) =>
          item.produtoId > 0 && Number.isFinite(item.quantidade) && item.quantidade > 0
      )

    if (itensValidos.length === 0) {
      setErro('Adicione ao menos um item com produto e quantidade válidos')
      return
    }

    setErro(null)
    setSaving(true)
    try {
      await window.api.createPedido({
        clienteId: Number(clienteId),
        usuarioId: user.id,
        condicaoPagamento: condicaoPagamento.trim() || null,
        prazoEntrega: prazoEntrega.trim() || null,
        itens: itensValidos,
      })
      setClienteId('')
      setCondicaoPagamento('')
      setPrazoEntrega('')
      setItens([novoItem()])
      onCriado()
    } catch (err) {
      setErro('Não foi possível lançar o pedido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2>Novo pedido</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Condição de pagamento</label>
          <input value={condicaoPagamento} onChange={(e) => setCondicaoPagamento(e.target.value)} />
        </div>
        <div>
          <label>Prazo de entrega</label>
          <input
            type="date"
            value={prazoEntrega}
            onChange={(e) => setPrazoEntrega(e.target.value)}
          />
        </div>

        <h3>Itens</h3>
        {itens.map((item, index) => (
          <div key={index}>
            <select
              value={item.produtoId}
              onChange={(e) => handleProdutoChange(index, e.target.value)}
            >
              <option value="">Produto...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.descricao}
                </option>
              ))}
            </select>
            <input
              placeholder="Quantidade"
              value={item.quantidade}
              onChange={(e) => updateItem(index, { quantidade: e.target.value })}
            />
            <input
              placeholder="Valor unitário"
              value={item.valorUnitario}
              onChange={(e) => updateItem(index, { valorUnitario: e.target.value })}
            />
            {itens.length > 1 && (
              <button type="button" onClick={() => removeItem(index)}>
                Remover
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addItem}>
          + Adicionar item
        </button>

        <div>
          <button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Lançar pedido'}
          </button>
        </div>
        {erro && <p className="error">{erro}</p>}
      </form>
    </div>
  )
}
