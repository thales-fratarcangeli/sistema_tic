import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import SetupFolder from './screens/SetupFolder'
import Login from './screens/Login'
import FinanceiroApp from './screens/financeiro/FinanceiroApp'
import ProducaoApp from './screens/producao/ProducaoApp'
import EstoqueApp from './screens/estoque/EstoqueApp'
import AdminApp from './screens/admin/AdminApp'

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  return (
    <div>
      <p>
        Logado como <strong>{user?.nome}</strong> ({user?.perfil})
        <button onClick={logout} style={{ marginLeft: '1rem' }}>
          Sair
        </button>
      </p>
      {children}
    </div>
  )
}

function Routed() {
  const { user } = useAuth()
  const [configured, setConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    window.api.getDbFolderPath().then((config) => setConfigured(config !== null))
  }, [])

  if (configured === null) return <p>Carregando...</p>
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
