import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { withWriteLock } from '../../../src/main/db/lock'

let tmpDir: string
let targetFile: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-lock-'))
  targetFile = path.join(tmpDir, 'dados.db')
  fs.writeFileSync(targetFile, '')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('withWriteLock', () => {
  it('runs the function and returns its result', async () => {
    const result = await withWriteLock(targetFile, () => 42)
    expect(result).toBe(42)
  })

  it('serializes concurrent calls (no interleaving)', async () => {
    const events: string[] = []

    const slow = withWriteLock(targetFile, async () => {
      events.push('slow:start')
      await new Promise((r) => setTimeout(r, 50))
      events.push('slow:end')
    })

    await new Promise((r) => setTimeout(r, 5))
    const fast = withWriteLock(targetFile, () => {
      events.push('fast:start')
      events.push('fast:end')
    })

    await Promise.all([slow, fast])

    expect(events).toEqual(['slow:start', 'slow:end', 'fast:start', 'fast:end'])
  })
})
