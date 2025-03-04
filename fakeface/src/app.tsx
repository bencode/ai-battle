import { component$, useTask$, useSignal } from '@builder.io/qwik'
import { StorePage } from './store'

export const App = component$(() => {
  const page = useSignal('/')

  useTask$(() => {
    page.value = window.location.pathname
  })

  return <>{page.value === '/' && <StorePage />}</>
})
