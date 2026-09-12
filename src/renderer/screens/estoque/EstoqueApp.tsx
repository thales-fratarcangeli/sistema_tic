import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import type { ItemAguardandoEntrada, ItemEmEstoque } from '../../../shared/types'

export default function EstoqueApp() {
  const { user, logout } = useAuth()
  const [aguardando, setAguardando] = useState<ItemAguardandoEntrada[]>([])
  const [emEstoque, setEmEstoque] = useState<ItemEmEstoque[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  async function reload() {
    setAguardando(await window.api.listAguardandoEntrada())
    setEmEstoque(await window.api.listEmEstoque())
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleEntrada(item: ItemAguardandoEntrada) {
    if (!user) return
    setErro(null)
    setBusyId(item.pedidoItemId)
    try {
      await window.api.registrarEntrada({
        pedidoItemId: item.pedidoItemId,
        usuarioId: user.id,
        quantidade: item.quantidade,
      })
      await reload()
    } catch (err) {
      setErro('Não foi possível confirmar a entrada')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSaida(item: ItemEmEstoque) {
    if (!user) return
    const confirmar = window.confirm(
      `Confirmar expedição de ${item.quantidade} ${item.produtoDescricao} para o pedido ${item.pedidoNumero}?`
    )
    if (!confirmar) return

    setErro(null)
    setBusyId(item.pedidoItemId)
    try {
      await window.api.registrarSaida({
        pedidoItemId: item.pedidoItemId,
        usuarioId: user.id,
        quantidade: item.quantidade,
      })
      await reload()
    } catch (err) {
      setErro('Não foi possível registrar a expedição')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <p>
        Logado como <strong>{user?.nome}</strong> ({user?.perfil})
        <button onClick={logout} style={{ marginLeft: '1rem' }}>
          Sair
        </button>
      </p>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <h2>Aguardando conferência de entrada</h2>
      <table>
        <thead>
          <tr>
            <th>OP</th>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Produto</th>
            <th>Quantidade</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {aguardando.map((item) => (
            <tr key={item.pedidoItemId}>
              <td>{item.opNumero}</td>
              <td>{item.pedidoNumero}</td>
              <td>{item.clienteNome}</td>
              <td>{item.produtoDescricao}</td>
              <td>{item.quantidade}</td>
              <td>
                <button
                  onClick={() => handleEntrada(item)}
                  disabled={busyId === item.pedidoItemId}
                >
                  Confirmar entrada
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {aguardando.length === 0 && <p>Nada aguardando conferência.</p>}

      <h2>Em estoque</h2>
      <table>
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Produto</th>
            <th>Quantidade</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {emEstoque.map((item) => (
            <tr key={item.pedidoItemId}>
              <td>{item.pedidoNumero}</td>
              <td>{item.clienteNome}</td>
              <td>{item.produtoDescricao}</td>
              <td>{item.quantidade}</td>
              <td>
                <button onClick={() => handleSaida(item)} disabled={busyId === item.pedidoItemId}>
                  Registrar saída/expedição
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {emEstoque.length === 0 && <p>Nada em estoque no momento.</p>}
    </div>
  )
}
