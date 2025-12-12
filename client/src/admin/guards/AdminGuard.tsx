import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'

export function AdminGuard({ children }: PropsWithChildren) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center">Lade…</div>
  }

  if (!user) {
    // Speichere die aktuelle URL als redirect Parameter
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

