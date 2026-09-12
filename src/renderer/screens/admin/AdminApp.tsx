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
      <nav className="tabs">
        <button className={tab === 'usuarios' ? 'active' : ''} onClick={() => setTab('usuarios')}>
          Usuários
        </button>
        <button
          className={tab === 'financeiro' ? 'active' : ''}
          onClick={() => setTab('financeiro')}
        >
          Financeiro
        </button>
        <button className={tab === 'producao' ? 'active' : ''} onClick={() => setTab('producao')}>
          Produção
        </button>
        <button className={tab === 'estoque' ? 'active' : ''} onClick={() => setTab('estoque')}>
          Estoque
        </button>
      </nav>

      {tab === 'usuarios' && <Usuarios />}
      {tab === 'financeiro' && <FinanceiroApp />}
      {tab === 'producao' && <ProducaoApp />}
      {tab === 'estoque' && <EstoqueApp />}
    </div>
  )
}
