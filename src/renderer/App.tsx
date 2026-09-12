import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import SetupFolder from './screens/SetupFolder'
import Login from './screens/Login'
import PlaceholderScreen from './screens/PlaceholderScreen'
import FinanceiroApp from './screens/financeiro/FinanceiroApp'
import ProducaoApp from './screens/producao/ProducaoApp'
import EstoqueApp from './screens/estoque/EstoqueApp'

function Routed() {
  const { user } = useAuth()
  const [configured, setConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    window.api.getDbFolderPath().then((config) => setConfigured(config !== null))
  }, [])

  if (configured === null) return <p>Carregando...</p>
  if (!configured) return <SetupFolder onConfigured={() => setConfigured(true)} />
  if (!user) return <Login />
  if (user.perfil === 'financeiro') return <FinanceiroApp />
  if (user.perfil === 'producao') return <ProducaoApp />
  if (user.perfil === 'estoque') return <EstoqueApp />
  return <PlaceholderScreen />
}

export default function App() {
  return (
    <AuthProvider>
      <Routed />
    </AuthProvider>
  )
}
