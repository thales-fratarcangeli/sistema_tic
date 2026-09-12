import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readConfig, writeConfig } from '../../src/main/config'

let tmpDir: string
let configPath: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-config-'))
  configPath = path.join(tmpDir, 'config.json')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('config', () => {
  it('returns null when no config file exists', () => {
    expect(readConfig(configPath)).toBeNull()
  })

  it('writes and reads back the dbFolderPath', () => {
    writeConfig(configPath, { dbFolderPath: '\\\\SERVIDOR\\bt_fitas' })
    expect(readConfig(configPath)).toEqual({ dbFolderPath: '\\\\SERVIDOR\\bt_fitas' })
  })
})
