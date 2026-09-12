import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import SetupFolder from './screens/SetupFolder'
import Login from './screens/Login'
import FinanceiroApp from './screens/financeiro/FinanceiroApp'
import ProducaoApp from './screens/producao/ProducaoApp'
import EstoqueApp from './screens/estoque/EstoqueApp'
import AdminApp from './screens/admin/AdminApp'

const PERFIL_LABEL: Record<string, string> = {
  financeiro: 'Financeiro',
  producao: 'Produção',
  estoque: 'Estoque',
  admin: 'Admin',
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">BT Fitas</span>
        <span className="topbar-user">
          {user?.nome} · {PERFIL_LABEL[user?.perfil ?? ''] ?? user?.perfil}
          <button className="link-button" onClick={logout}>
            Sair
          </button>
        </span>
      </header>
      <main className="container">{children}</main>
    </div>
  )
}

function Routed() {
  const { user } = useAuth()
  const [configured, setConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    window.api.getDbFolderPath().then((config) => setConfigured(config !== null))
  }, [])

  if (configured === null) return <p className="loading">Carregando...</p>
  if (!configured) return <SetupFolder onConfigured={() => setConfigured(true)} />
  if (!user) return <Login />

  return (
    <AppShell>
      {user.perfil === 'financeiro' && <FinanceiroApp />}
      {user.perfil === 'producao' && <ProducaoApp />}
      {user.perfil === 'estoque' && <EstoqueApp />}
      {user.perfil === 'admin' && <AdminApp />}
    </AppShell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routed />
    </AuthProvider>
  )
}
