import lockfile from 'proper-lockfile'

export async function withWriteLock<T>(
  targetFilePath: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const release = await lockfile.lock(targetFilePath, {
    retries: { retries: 20, minTimeout: 100, maxTimeout: 500 },
    stale: 10000,
  })
  try {
    return await fn()
  } finally {
    await release()
  }
}
