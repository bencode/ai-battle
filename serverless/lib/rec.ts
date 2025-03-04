const cookies = parseCookies(req.headers.get('Cookie') || '')
let sessionId = cookies['SessionId']
if (!sessionId) {
  sessionId = nanoid()
}
server.upgrade(req, {
  data: {
    sessionId,
    createdAt: Date.now(),
  },
  headers: {
    'Set-Cookie': `SessionId=${sessionId}; Path=/; HttpOnly`,
  },
})

function parseCookies(str: string) {
  const cookies = Object.fromEntries(
    str
      .split(/;\s*/)
      .filter(Boolean)
      .map(item => {
        const [key, value] = item.split('=')
        return [key, value]
      }),
  )
  return cookies
}
