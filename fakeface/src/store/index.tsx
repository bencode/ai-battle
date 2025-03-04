import { component$, useSignal, $ } from '@builder.io/qwik'

export const StorePage = component$(() => {
  const text = useSignal('')
  const result = useSignal('')
  const error = useSignal('')

  const handlePost = $(async () => {
    const expr = getTokens(text.value)
    text.value = ''
    const response = await fetch('/api/rds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expr),
    })
    if (response.ok) {
      const res = await response.json()
      error.value = ''
      result.value = ''

      if (res?.success) {
        result.value = res.data
      } else {
        error.value = res.message
      }
    }
  })

  return (
    <div style="display:flex">
      <div style="flex: 1">
        <textarea
          rows={10}
          cols={60}
          value={text.value}
          onInput$={e => (text.value = (e.target as HTMLTextAreaElement).value)}
          onKeyDown$={e => {
            if (!e.ctrlKey && !e.metaKey && e.key === 'Enter') {
              e.preventDefault()
              handlePost()
            }
          }}
        />
        <br />
        <button onClick$={handlePost}>Submit</button>
      </div>
      <div style="flex: 1">
        {result.value ? (
          <div>
            <Preview value={result.value} />
          </div>
        ) : null}
        {error.value ? (
          <div
            style="
        color: red;
        background-color: #ffe6e6;
        padding: 10px;
        border: 1px solid red;
        border-radius: 4px;
        font-size: 14px;
      "
          >
            {error.value}
          </div>
        ) : null}
      </div>
    </div>
  )
})

type PreviewProps = {
  value: unknown
}

const Preview = component$(({ value }: PreviewProps) => {
  if (value !== null && typeof value === 'object') {
    return <pre>{JSON.stringify(value, null, 2)}</pre>
  }
  return <div>{`${value}`}</div>
})

function getTokens(body: string) {
  const regex = /"((?:\\.|[^"\\])*)"|(\S+)/g
  const tokens = []
  let match
  while ((match = regex.exec(body)) !== null) {
    tokens.push(match[1] || match[2])
  }
  return tokens
}
