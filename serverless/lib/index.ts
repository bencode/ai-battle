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

  await startWebServer({ redis: client })
  await startWebsocket({ redis: client })
}

type RedisClient = Awaited<ReturnType<typeof createClient>>
type Services = {
  redis: RedisClient
}

type Fn = (...args: any[]) => unknown

async function startWebServer({ redis }: Services) {
  Bun.serve({
    port: 3001,

    routes: {
      '/api/status': new Response('OK'),

      '/api/rds': {
        POST: async req => {
          const [cmd, ...args] = await req.json()
          debug('%s %o', cmd, args)
          const fn = redis[cmd as keyof typeof redis] as unknown as Fn
          if (!fn) {
            return Response.json({ success: false, message: `Invalid Redis command: ${cmd}` })
          }
          try {
            const result = await fn.apply(redis, args)
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

async function startWebsocket({ redis }: Services) {
  Bun.serve({
    port: 3002,

    async fetch(req, server) {},

    websocket: {
      open(ws) {},

      message(ws, message) {
        console.log('收到消息:', message)
        ws.send(`回显: ${message}`)
      },

      close(ws, code, reason) {
        console.log(`连接关闭：${code} ${reason}`)
      },
    },
  })
}
