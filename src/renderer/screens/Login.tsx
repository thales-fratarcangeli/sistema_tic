import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [loginValue, setLoginValue] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const ok = await login(loginValue, senha)
    if (!ok) setErro('Usuário ou senha inválidos')
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>bt_fitas — Login</h1>
      <div>
        <label>Usuário</label>
        <input value={loginValue} onChange={(e) => setLoginValue(e.target.value)} />
      </div>
      <div>
        <label>Senha</label>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}
      <button type="submit">Entrar</button>
    </form>
  )
}
