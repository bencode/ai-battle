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

type Fn = (...args: any[]) => unknown

async function startWebServer({ client }: Services) {
  Bun.serve({
    port: 3001,

    routes: {
      '/api/status': new Response('OK'),

      '/api/rds': {
        POST: async req => {
          const [cmd, ...args] = await req.json()
          debug('RDS: %s %o', cmd, args)
          const fn = client[cmd as keyof typeof client] as unknown as Fn
          if (!fn) {
            return Response.json({ success: false, message: `Invalid Redis command: ${cmd}` })
          }
          try {
            const result = await fn.apply(client, args)
            return Response.json({ success: true, data: result })
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
        debug('ws open')
        ws.subscribe('pub')
      },

      async message(ws, message) {
        debug('ws message', message)
      },

      close(ws, code, reason) {
        debug('ws close', code, reason)
        ws.unsubscribe('message')
      },
    },
  })

  subscriber.subscribe('pub', msg => {
    debug('ws: publish', msg)
    server.publish('pub', msg)
  })
}
