import { component$, useSignal, $, useTask$ } from '@builder.io/qwik'
import { rds, rdss } from '../utils/rds'

type User = {
  id: number
  nick: string
}

type Message = {
  userId: number
  user?: User
  body: string
  time: Date
}

export const ChatPage = component$(() => {
  const currentMessage = useSignal('')
  const messages = useSignal<Message[]>([])
  const onlineUsers = useSignal<User[]>([])
  const currentUser = useSignal(0)
  const likes = useSignal<Record<string, number>>({})

  useTask$(() => {
    const load = async () => {
      onlineUsers.value = await loadUsers()
      messages.value = await loadMessages()
      likes.value = await loadLikes()
    }

    load()

    const socket = new WebSocket('ws://localhost:3002')
    socket.onopen = () => {
      console.log('open')
    }

    socket.onmessage = async event => {
      const type = event.data
      if (type === 'join') {
        onlineUsers.value = await loadUsers()
      }
      if (type === 'message') {
        messages.value = await loadMessages()
      }
      if (type === 'like') {
        likes.value = await loadLikes()
      }
    }

    socket.onerror = error => {
      console.error('WebSocket error:', error)
    }

    socket.onclose = () => {
      console.log('WebSocket closed')
    }

    return () => {
      console.log('WebSocket close')
      socket.close()
    }
  })

  const handleJoin = $(async () => {
    const userId = await rds('incr', 'genUserId')
    const userKey = `users:${userId}`
    const nick = `User ${userId}`
    await rds('hSet', userKey, { id: userId, nick })
    await rds('expire', userKey, 60 * 10)
    await rds('publish', 'event', 'join')
    currentUser.value = userId
  })

  const handleSend = $(async () => {
    const msg = currentMessage.value.trim()
    if (msg !== '') {
      currentMessage.value = ''
      await sendMessage(currentUser.value, msg)
    }
  })

  const handleLike = $(async (id: number) => {
    await rds('zIncrBy', 'likes', 1, `${id}`)
    await rds('publish', 'event', 'like')
  })

  return (
    <div style="display: flex; height: 100vh;">
      <div style="flex: 1; display: flex; flex-direction: column; padding: 10px; border-right: 1px solid #ccc;">
        <div style="flex: 1; overflow-y: auto; border: 1px solid #ddd; padding: 10px;">
          {messages.value.map((msg, index) => (
            <div key={index} style="margin-bottom: 8px;">
              <div>User: {msg.user?.nick}</div>
              <div>Time: {`${msg.time}`}</div>
              <div>{msg.body}</div>
            </div>
          ))}
        </div>
        <div style="margin-top: 10px;">
          {!currentUser.value ? (
            <button onClick$={handleJoin}>Join</button>
          ) : (
            <div>
              <textarea
                rows={3}
                style="width: 100%;"
                value={currentMessage.value}
                onInput$={e => (currentMessage.value = (e.target as HTMLTextAreaElement).value)}
                onKeyDown$={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    handleSend()
                  }
                }}
              />
              <button onClick$={handleSend} style="margin-top: 5px;">
                Send
              </button>
            </div>
          )}
        </div>
      </div>
      <div style="width: 200px; padding: 10px;">
        <h3>Online Users</h3>
        <ul>
          {onlineUsers.value.map((user, index) => (
            <li key={index} onClick$={() => handleLike(user.id)}>
              {user.nick}
              {likes.value[user.id] ? <span>({likes.value[user.id]})</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
})

async function loadUsers() {
  const keys: string[] = await rds('keys', 'users:*')
  const users = await rdss(keys.map(key => ['hGetAll', key]))
  return users as User[]
}

async function sendMessage(userId: number, body: string) {
  const message = { userId, body, time: new Date() }
  await rds('lPush', 'messages', JSON.stringify(message))
  await rds('publish', 'event', 'message')
}

async function loadMessages() {
  const rlist: string[] = await rds('lRange', 'messages', 0, 10)
  const messages: Message[] = rlist.reverse().map(json => JSON.parse(json))
  const users = await loadUsers()
  const map = new Map(users.map(user => [+user.id, user]))
  const result = messages.map(msg => {
    return { ...msg, user: map.get(msg.userId) }
  })
  return result
}

async function loadLikes() {
  type Item = { score: number; value: string }
  const likes: Item[] = await rds('zRangeWithScores', 'likes', 0, -1)
  if (!likes) {
    return {}
  }

  return likes.reduce(
    (acc, item) => {
      acc[item.value] = item.score
      return acc
    },
    {} as Record<string, number>,
  )
}
