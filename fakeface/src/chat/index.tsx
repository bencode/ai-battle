import { component$, useSignal, $ } from '@builder.io/qwik'
import { rds } from '../utils/rds'

export const ChatPage = component$(() => {
  const isLoggedIn = useSignal(false)
  const currentMessage = useSignal('')
  const messages = useSignal<string[]>([])
  const onlineUsers = useSignal<string[]>(['Alice', 'Bob', 'Charlie'])

  const handleJoin = $(async () => {
    const userId = await rds('incr', 'genUserId')

    // rPush只能是字符串
    await rds('rPush', 'users', `${userId}`)

    const userKey = `users:${userId}`
    const nick = `User ${userId}`
    await rds('hSet', userKey, 'nick', nick)
    await rds('expire', userKey, 60)
  })

  const handleSend = $(() => {
    const msg = currentMessage.value.trim()
    if (msg !== '') {
      messages.value = [...messages.value, msg]
      currentMessage.value = ''
    }
  })

  return (
    <div style="display: flex; height: 100vh;">
      <div style="flex: 1; display: flex; flex-direction: column; padding: 10px; border-right: 1px solid #ccc;">
        <div style="flex: 1; overflow-y: auto; border: 1px solid #ddd; padding: 10px;">
          {messages.value.map((msg, index) => (
            <div key={index} style="margin-bottom: 8px;">
              {msg}
            </div>
          ))}
        </div>
        <div style="margin-top: 10px;">
          {!isLoggedIn.value ? (
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
            <li key={index}>{user}</li>
          ))}
        </ul>
      </div>
    </div>
  )
})
