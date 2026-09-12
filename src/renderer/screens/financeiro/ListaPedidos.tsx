import { useEffect, useImperativeHandle, forwardRef, useState } from 'react'
import type { PedidoComItens } from '../../../shared/types'

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Aberto',
  em_producao: 'Em produção',
  aguardando_estoque: 'Aguardando estoque',
  em_estoque: 'Em estoque',
  finalizado: 'Finalizado',
}

export interface ListaPedidosHandle {
  reload: () => void
}

const ListaPedidos = forwardRef<ListaPedidosHandle>((_props, ref) => {
  const [pedidos, setPedidos] = useState<PedidoComItens[]>([])

  async function reload() {
    setPedidos(await window.api.listPedidos())
  }

  useImperativeHandle(ref, () => ({ reload }))

  useEffect(() => {
    reload()
  }, [])

  return (
    <div>
      <h2>Pedidos</h2>
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Cliente</th>
            <th>Item</th>
            <th>Quantidade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) =>
            pedido.itens.map((item, index) => (
              <tr key={item.id}>
                {index === 0 && <td rowSpan={pedido.itens.length}>{pedido.numero}</td>}
                {index === 0 && <td rowSpan={pedido.itens.length}>{pedido.clienteNome}</td>}
                <td>{item.produtoDescricao}</td>
                <td>{item.quantidade}</td>
                <td>{STATUS_LABEL[item.status] ?? item.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
})

export default ListaPedidos
