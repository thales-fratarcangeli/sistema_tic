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
    <div>
      <h1>Configuração inicial</h1>
      <p>
        Informe o caminho da pasta compartilhada na rede (ex: \\SERVIDOR\bt_fitas).
        Para testar sozinho num computador só, pode deixar o caminho local
        preenchido abaixo.
      </p>
      <input
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="\\SERVIDOR\bt_fitas"
        style={{ width: '400px' }}
      />
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}
    </div>
  )
}
