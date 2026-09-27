import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Usuario } from '../../shared/types'
import { api, hasToken, setOnUnauthorized, setToken } from '../api'

interface AuthContextValue {
  user: Usuario | null
  /** true enquanto confere se a sessão salva (após um F5) ainda vale. */
  restoring: boolean
  login: (login: string, senha: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [restoring, setRestoring] = useState(hasToken())

  useEffect(() => {
    setOnUnauthorized(() => setUser(null))
    if (hasToken()) {
      api
        .me()
        .then(setUser)
        .catch(() => setToken(null))
        .finally(() => setRestoring(false))
    }
    return () => setOnUnauthorized(null)
  }, [])

  async function login(loginValue: string, senha: string): Promise<boolean> {
    try {
      const { token, usuario } = await api.login(loginValue, senha)
      setToken(token)
      setUser(usuario)
      return true
    } catch {
      return false
    }
  }

  function logout() {
    api.logout().catch(() => {})
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, restoring, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
