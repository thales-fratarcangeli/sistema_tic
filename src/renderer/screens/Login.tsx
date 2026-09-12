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
    <div className="center-screen">
      <form className="card" onSubmit={handleSubmit}>
        <h1 className="brand">BT Fitas</h1>
        <p className="subtitle">Entrar no sistema</p>
        <div className="field">
          <label>Usuário</label>
          <input value={loginValue} onChange={(e) => setLoginValue(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>Senha</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        {erro && <p className="error">{erro}</p>}
        <button className="primary" type="submit">
          Entrar
        </button>
      </form>
    </div>
  )
}
