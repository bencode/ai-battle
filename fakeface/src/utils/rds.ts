export async function rds(cmd: string, ...args: unknown[]) {
  globalThis.console.debug('%s, %o', cmd, args)
  const data = await post('/api/rds', [cmd, ...args])
  globalThis.console.debug('  -> %o', data)
  return data
}

type Action = [cmd: string, ...args: unknown[]]

export async function rdss(actions: Action[]) {
  globalThis.console.debug('actions: %o', actions)
  const data = await post('/api/rdss', actions)
  globalThis.console.debug('  -> %o', data)
  return data
}

async function post(url: string, payload: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`)
  }
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data
}
