import { useEffect, useRef, useState } from 'react'
import { templatesApi } from '../lib/api'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * useAutosave — debounced template save to backend.
 *
 * Watches `value` for changes. After `delay` ms of no new changes,
 * calls `saveFn`. Returns current save status for UI feedback.
 *
 * Does NOT save on the first render (only on subsequent changes).
 */
export function useAutosave<T>(
  value:    T,
  saveFn:   (value: T) => Promise<void>,
  delay     = 1500,
): SaveStatus {
  const [status,    setStatus]    = useState<SaveStatus>('idle')
  const isFirstRun  = useRef(true)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveFnRef   = useRef(saveFn)

  // Keep saveFn ref fresh so stale closures don't cause issues
  useEffect(() => { saveFnRef.current = saveFn }, [saveFn])

  useEffect(() => {
    // Skip the initial mount — only save on actual changes
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }

    // Clear any pending timer
    if (timerRef.current) clearTimeout(timerRef.current)

    setStatus('saving')

    timerRef.current = setTimeout(async () => {
      try {
        await saveFnRef.current(value)
        setStatus('saved')
        // Reset to idle after 2s so the indicator fades away
        setTimeout(() => setStatus('idle'), 2000)
      } catch {
        setStatus('error')
      }
    }, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, delay])

  return status
}

/**
 * useTemplateSave — wires useAutosave to the template + backend context.
 * Returns save status for the editor header indicator.
 */
export function useTemplateSave(
  template:   unknown,
  projectId:  string | null,
  templateId: string | null,
): SaveStatus {
  const saveFn = async (tpl: unknown) => {
    if (!projectId || !templateId) return
    const t = tpl as { name: string }
    await templatesApi.update(projectId, templateId, t.name, tpl)
  }

  return useAutosave(template, saveFn, 1500)
}