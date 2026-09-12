import { useEffect, useState } from 'react'
import type { Produto } from '../../../shared/types'

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [unidade, setUnidade] = useState('')
  const [valorUnitario, setValorUnitario] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function reload() {
    setProdutos(await window.api.listProdutos())
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valor = Number(valorUnitario.replace(',', '.'))
    if (!codigo.trim() || !descricao.trim() || !unidade.trim() || !Number.isFinite(valor)) {
      setErro('Preencha código, descrição, unidade e um valor unitário válido')
      return
    }
    setErro(null)
    setSaving(true)
    try {
      await window.api.createProduto({
        codigo: codigo.trim(),
        descricao: descricao.trim(),
        unidade: unidade.trim(),
        valorUnitarioPadrao: valor,
      })
      setCodigo('')
      setDescricao('')
      setUnidade('')
      setValorUnitario('')
      await reload()
    } catch (err) {
      setErro('Não foi possível salvar o produto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2>Produtos</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <input
          placeholder="Descrição (ex: FITA PP 45MM X 100MTS TRANSPARENTE)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          style={{ width: '320px' }}
        />
        <input
          placeholder="Unidade (ex: ROLO)"
          value={unidade}
          onChange={(e) => setUnidade(e.target.value)}
        />
        <input
          placeholder="Valor unitário"
          value={valorUnitario}
          onChange={(e) => setValorUnitario(e.target.value)}
        />
        <button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Adicionar produto'}
        </button>
      </form>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th>Unidade</th>
            <th>Valor unitário</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => (
            <tr key={p.id}>
              <td>{p.codigo}</td>
              <td>{p.descricao}</td>
              <td>{p.unidade}</td>
              <td>{p.valorUnitarioPadrao.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
