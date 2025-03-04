import createDebug from 'debug'
import { createClient } from 'redis'

const debug = createDebug('bcd:server')

start().catch(e => {
  globalThis.console.error(e)
  throw e
})

async function start() {
  const client = await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect()

  const subscriber = await createClient()
    .on('error', err => console.log('Redis Publisher Error'))
    .connect()

  await startWebServer({ client, subscriber })
  await startWebsocket({ client, subscriber })
}

type RedisClient = Awaited<ReturnType<typeof createClient>>
type Services = {
  client: RedisClient
  subscriber: RedisClient
}

type Action = [cmd: string, ...args: unknown]
type Fn = (...args: any[]) => unknown

async function startWebServer({ client }: Services) {
  const call = async ([cmd, ...args]: Action) => {
    debug('RDS %s, %o', cmd, args)
    const fn = client[cmd as keyof typeof client] as unknown as Fn
    if (!fn) {
      throw new Error(`Invalid Redis command: ${cmd}`)
    }
    return fn.apply(client, args)
  }

  Bun.serve({
    port: 3001,

    routes: {
      '/api/status': new Response('OK'),

      '/api/rds': {
        POST: async req => {
          const action = await req.json()
          try {
            const result = await call(action)
            return Response.json({ success: true, data: result })
          } catch (e) {
            const err = e as Error
            globalThis.console.error(e)
            return Response.json({ success: false, message: err.message })
          }
        },
      },

      '/api/rdss': {
        POST: async req => {
          const actions = await req.json()
          try {
            const tasks = actions.map(call)
            const results = await Promise.all(tasks)
            return Response.json({ success: true, data: results })
          } catch (e) {
            const err = e as Error
            globalThis.console.error(e)
            return Response.json({ success: false, message: err.message })
          }
        },
      },
    },

    fetch(_req: unknown) {
      return new Response('Not Found', { status: 404 })
    },
  })
}

async function startWebsocket({ client, subscriber }: Services) {
  const server = Bun.serve({
    port: 3002,

    async fetch(req, server) {
      server.upgrade(req, { data: {} })
    },

    websocket: {
      async open(ws) {
        debug('WS open: %o', ws.data)
        ws.subscribe('event')
      },

      async message(ws, message) {
        debug('WS message', message)
      },

      close(ws, code, reason) {
        debug('WS close', code, reason)
        ws.unsubscribe('event')
      },
    },
  })

  subscriber.subscribe('event', msg => {
    debug('WS: publish event', msg)
    server.publish('event', msg)
  })
}
