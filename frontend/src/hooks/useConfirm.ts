import { useState, useCallback } from 'react'

type ConfirmOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
}

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state?.resolve(true)
    setState(null)
  }, [state])

  const handleCancel = useCallback(() => {
    state?.resolve(false)
    setState(null)
  }, [state])

  return {
    confirm,
    dialogProps: state
      ? {
          title:        state.title,
          message:      state.message,
          confirmLabel: state.confirmLabel,
          cancelLabel:  state.cancelLabel,
          variant:      state.variant,
          onConfirm:    handleConfirm,
          onCancel:     handleCancel,
        }
      : null,
  }
}