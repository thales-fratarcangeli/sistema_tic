import { useState } from 'react'
import Usuarios from './Usuarios'
import FinanceiroApp from '../financeiro/FinanceiroApp'
import ProducaoApp from '../producao/ProducaoApp'
import EstoqueApp from '../estoque/EstoqueApp'

type Tab = 'usuarios' | 'financeiro' | 'producao' | 'estoque'

export default function AdminApp() {
  const [tab, setTab] = useState<Tab>('usuarios')

  return (
    <div>
      <nav>
        <button onClick={() => setTab('usuarios')}>Usuários</button>
        <button onClick={() => setTab('financeiro')}>Financeiro</button>
        <button onClick={() => setTab('producao')}>Produção</button>
        <button onClick={() => setTab('estoque')}>Estoque</button>
      </nav>

      {tab === 'usuarios' && <Usuarios />}
      {tab === 'financeiro' && <FinanceiroApp />}
      {tab === 'producao' && <ProducaoApp />}
      {tab === 'estoque' && <EstoqueApp />}
    </div>
  )
}
