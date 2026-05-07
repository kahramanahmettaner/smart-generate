import { useEditorStore } from '../store/useEditorStore'

export function useHistory() {
  const { undo, redo, pastStates, futureStates } =
    useEditorStore.temporal.getState()

  return {
    undo,
    redo,
    canUndo: pastStates.length  > 0,
    canRedo: futureStates.length > 0,
  }
}