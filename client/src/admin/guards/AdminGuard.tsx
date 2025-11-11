import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'

export function AdminGuard({ children }: PropsWithChildren) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center">Lade…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

