import { useState } from 'react'

export default function SetupFolder({ onConfigured }: { onConfigured: () => void }) {
  const [path, setPath] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!path.trim()) return
    setSaving(true)
    await window.api.setDbFolderPath(path.trim())
    await window.api.ensureSeedAdmin()
    setSaving(false)
    onConfigured()
  }

  return (
    <div>
      <h1>Configuração inicial</h1>
      <p>Informe o caminho da pasta compartilhada na rede (ex: \\SERVIDOR\bt_fitas):</p>
      <input
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="\\SERVIDOR\bt_fitas"
        style={{ width: '400px' }}
      />
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}
