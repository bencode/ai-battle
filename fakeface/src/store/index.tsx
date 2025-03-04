import { component$, useSignal, $ } from '@builder.io/qwik'

export const StorePage = component$(() => {
  const text = useSignal('')
  const result = useSignal('')
  const error = useSignal('')

  const handlePost = $(async () => {
    const expr = text.value.split(/\s+/)
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
    <div>
      <textarea
        rows={5}
        cols={40}
        value={text.value}
        onInput$={e => (text.value = (e.target as HTMLTextAreaElement).value)}
      />
      <br />
      <button onClick$={handlePost}>Submit</button>
      {result.value ? (
        <div>
          <h3>Output: </h3>
          <div>
            <Preview value={result.value} />
          </div>
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
