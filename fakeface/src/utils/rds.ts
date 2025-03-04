export async function rds(cmd: string, ...args: unknown[]) {
  globalThis.console.debug('%s, %o', cmd, args)

  const res = await fetch('/api/rds', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([cmd, ...args]),
  })
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`)
  }
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message)
  }

  globalThis.console.debug('  -> %o', data.data)
  return data.data
}
