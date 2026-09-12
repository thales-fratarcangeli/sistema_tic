import { useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import Clientes from './Clientes'
import Produtos from './Produtos'
import NovoPedido from './NovoPedido'
import ListaPedidos, { type ListaPedidosHandle } from './ListaPedidos'

type Tab = 'pedidos' | 'novo-pedido' | 'clientes' | 'produtos'

export default function FinanceiroApp() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('pedidos')
  const listaPedidosRef = useRef<ListaPedidosHandle>(null)

  function handlePedidoCriado() {
    setTab('pedidos')
    listaPedidosRef.current?.reload()
  }

  return (
    <div>
      <p>
        Logado como <strong>{user?.nome}</strong> ({user?.perfil})
        <button onClick={logout} style={{ marginLeft: '1rem' }}>
          Sair
        </button>
      </p>
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
