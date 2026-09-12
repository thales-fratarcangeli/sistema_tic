import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Usuario } from '../../shared/types'

interface AuthContextValue {
  user: Usuario | null
  login: (login: string, senha: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)

  async function login(loginValue: string, senha: string): Promise<boolean> {
    const found = await window.api.login(loginValue, senha)
    if (found) {
      setUser(found)
      return true
    }
    return false
  }

  function logout() {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
