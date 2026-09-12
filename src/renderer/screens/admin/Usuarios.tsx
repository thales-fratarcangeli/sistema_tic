import { useEffect, useState } from 'react'
import type { Usuario, Perfil } from '../../../shared/types'

const PERFIS: Perfil[] = ['financeiro', 'admin', 'producao', 'estoque']

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [nome, setNome] = useState('')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [perfil, setPerfil] = useState<Perfil>('financeiro')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function reload() {
    setUsuarios(await window.api.listUsuarios())
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !login.trim() || !senha.trim()) {
      setErro('Nome, usuário e senha são obrigatórios')
      return
    }
    setErro(null)
    setSaving(true)
    try {
      await window.api.createUsuario({ nome: nome.trim(), login: login.trim(), senha, perfil })
      setNome('')
      setLogin('')
      setSenha('')
      setPerfil('financeiro')
      await reload()
    } catch (err) {
      setErro('Não foi possível criar o usuário (login já em uso?)')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAtivo(usuario: Usuario) {
    await window.api.setUsuarioAtivo(usuario.id, !usuario.ativo)
    await reload()
  }

  async function handlePerfilChange(usuario: Usuario, novoPerfil: Perfil) {
    await window.api.setUsuarioPerfil(usuario.id, novoPerfil)
    await reload()
  }

  async function handleResetSenha(usuario: Usuario) {
    const novaSenha = window.prompt(`Nova senha para ${usuario.nome}:`)
    if (!novaSenha) return
    await window.api.resetUsuarioSenha(usuario.id, novaSenha)
  }

  return (
    <div>
      <h2>Usuários</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input placeholder="Usuário" value={login} onChange={(e) => setLogin(e.target.value)} />
        <input
          placeholder="Senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <select value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
          {PERFIS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Criar usuário'}
        </button>
      </form>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Usuário</th>
            <th>Perfil</th>
            <th>Ativo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nome}</td>
              <td>{u.login}</td>
              <td>
                <select value={u.perfil} onChange={(e) => handlePerfilChange(u, e.target.value as Perfil)}>
                  {PERFIS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </td>
              <td>{u.ativo ? 'Sim' : 'Não'}</td>
              <td>
                <button onClick={() => handleToggleAtivo(u)}>
                  {u.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button onClick={() => handleResetSenha(u)}>Redefinir senha</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
