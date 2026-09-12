import { useState } from 'react'

export default function SetupFolder({ onConfigured }: { onConfigured: () => void }) {
  const [path, setPath] = useState('C:\\bt_fitas_dados')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSave() {
    if (!path.trim()) return
    setErro(null)
    setSaving(true)
    try {
      await window.api.setDbFolderPath(path.trim())
      await window.api.ensureSeedAdmin()
      onConfigured()
    } catch (err) {
      setErro(
        'Não foi possível usar esse caminho. Confira se ele existe (ou pode ser criado) e se você tem permissão de escrita nele.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="center-screen">
      <div className="card">
        <h1 className="brand">BT Fitas</h1>
        <p className="subtitle">Configuração inicial</p>
        <p>
          Informe o caminho da pasta compartilhada na rede (ex:{' '}
          <code>\\SERVIDOR\bt_fitas</code>). Para testar sozinho num computador
          só, pode deixar o caminho local já preenchido abaixo.
        </p>
        <div className="field">
          <label>Pasta compartilhada</label>
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="\\SERVIDOR\bt_fitas"
          />
        </div>
        <button className="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {erro && <p className="error">{erro}</p>}
      </div>
    </div>
  )
}
