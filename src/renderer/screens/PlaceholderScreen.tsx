import { useAuth } from '../auth/AuthContext'

export default function PlaceholderScreen() {
  const { user, logout } = useAuth()

  return (
    <div>
      <p>
        Logado como <strong>{user?.nome}</strong> ({user?.perfil})
        <button onClick={logout} style={{ marginLeft: '1rem' }}>
          Sair
        </button>
      </p>
      <p>Tela de "{user?.perfil}" em construção.</p>
    </div>
  )
}
