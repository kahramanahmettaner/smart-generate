import { useEffect } from 'react'

type Binding = {
  key: string
  meta?: boolean
  shift?: boolean
  handler: () => void
}

// Elements where typing is expected — shortcuts should be suppressed
function isEditingText(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (target.isContentEditable) return true
  return false
}

// Some shortcuts should ALWAYS fire even when editing text
// e.g. Ctrl+Z undo, Ctrl+S save — anything with a meta key modifier
function isSafeWhileEditing(binding: Binding): boolean {
  return binding.meta === true
}

export function useKeyboard(bindings: Binding[]) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const editing = isEditingText(document.activeElement)

      for (const binding of bindings) {
        // If user is typing in an input, only allow meta combos (Ctrl+Z etc.)
        if (editing && !isSafeWhileEditing(binding)) continue

        const metaMatch  = binding.meta   ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey)
        const shiftMatch = binding.shift  ? e.shiftKey : !e.shiftKey

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