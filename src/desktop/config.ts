import fs from 'node:fs'

export interface AppConfig {
  dbFolderPath: string
}

export function readConfig(configPath: string): AppConfig | null {
  if (!fs.existsSync(configPath)) return null
  const raw = fs.readFileSync(configPath, 'utf-8')
  return JSON.parse(raw) as AppConfig
}

export function writeConfig(configPath: string, config: AppConfig): void {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}
