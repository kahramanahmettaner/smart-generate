import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

type Props = {
  children: React.ReactNode
}

export function AuthGuard({ children }: Props) {
  const { user, loading, fetchMe } = useAuthStore()

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '14px',
        color: 'var(--color-text-tertiary)',
      }}>
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
