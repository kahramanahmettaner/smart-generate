import { useEffect } from 'react'

type Binding = {
  key: string
  meta?: boolean
  shift?: boolean
  handler: () => void
}

export function useKeyboard(bindings: Binding[]) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      for (const binding of bindings) {
        const metaMatch = binding.meta ? (e.ctrlKey || e.metaKey) : true
        const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey
        if (
          e.key.toLowerCase() === binding.key.toLowerCase() &&
          metaMatch &&
          shiftMatch
        ) {
          e.preventDefault()
          binding.handler()
          return
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [bindings])
}