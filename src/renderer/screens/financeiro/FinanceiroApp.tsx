import { useRef, useState } from 'react'
import Clientes from './Clientes'
import Produtos from './Produtos'
import NovoPedido from './NovoPedido'
import ListaPedidos, { type ListaPedidosHandle } from './ListaPedidos'

type Tab = 'pedidos' | 'novo-pedido' | 'clientes' | 'produtos'

export default function FinanceiroApp() {
  const [tab, setTab] = useState<Tab>('pedidos')
  const listaPedidosRef = useRef<ListaPedidosHandle>(null)

  function handlePedidoCriado() {
    setTab('pedidos')
    listaPedidosRef.current?.reload()
  }

  return (
    <div>
      <nav>
        <button onClick={() => setTab('pedidos')}>Pedidos</button>
        <button onClick={() => setTab('novo-pedido')}>Novo pedido</button>
        <button onClick={() => setTab('clientes')}>Clientes</button>
        <button onClick={() => setTab('produtos')}>Produtos</button>
      </nav>

      {tab === 'pedidos' && <ListaPedidos ref={listaPedidosRef} />}
      {tab === 'novo-pedido' && <NovoPedido onCriado={handlePedidoCriado} />}
      {tab === 'clientes' && <Clientes />}
      {tab === 'produtos' && <Produtos />}
    </div>
  )
}
