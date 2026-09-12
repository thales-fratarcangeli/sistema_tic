import { useEffect, useState } from 'react'
import type { Cliente } from '../../../shared/types'

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [cnpjCpf, setCnpjCpf] = useState('')
  const [cidade, setCidade] = useState('')
  const [telefone, setTelefone] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function reload() {
    setClientes(await window.api.listClientes())
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo.trim() || !nome.trim() || !cnpjCpf.trim()) {
      setErro('Código, nome e CNPJ/CPF são obrigatórios')
      return
    }
    setErro(null)
    setSaving(true)
    try {
      await window.api.createCliente({
        codigo: codigo.trim(),
        nome: nome.trim(),
        cnpjCpf: cnpjCpf.trim(),
        cidade: cidade.trim() || null,
        telefone: telefone.trim() || null,
      })
      setCodigo('')
      setNome('')
      setCnpjCpf('')
      setCidade('')
      setTelefone('')
      await reload()
    } catch (err) {
      setErro('Não foi possível salvar o cliente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2>Clientes</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input
          placeholder="CNPJ/CPF"
          value={cnpjCpf}
          onChange={(e) => setCnpjCpf(e.target.value)}
        />
        <input placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
        <input
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
        <button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Adicionar cliente'}
        </button>
      </form>
      {erro && <p className="error">{erro}</p>}

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nome</th>
            <th>CNPJ/CPF</th>
            <th>Cidade</th>
            <th>Telefone</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id}>
              <td>{c.codigo}</td>
              <td>{c.nome}</td>
              <td>{c.cnpjCpf}</td>
              <td>{c.cidade}</td>
              <td>{c.telefone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
